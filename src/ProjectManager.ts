import localforage from "localforage";
import type { App } from "./App";
import type { RightPanelScene } from "./rightPanelScene";
import { FrameListElement } from "./FrameListElement";
import { TProjectData } from "./models/TProjectData";
import { deleteButtonSVG } from "./constant";

export class ProjectManager
{
    private app: App;
    private store: LocalForage;


    constructor(app: App)
    {
        this.app = app;
        this.bind();
        this.addEventListeners();
        this.store = localforage.createInstance({
            name: 'AnimationFrameBuilder',
            storeName: 'projects',
            description: 'Store project data'
        });
        this.restoreLastSession();
    }

    private bind()
    {
        this.saveProject = this.saveProject.bind(this);
        this.handleOpenProjectClick = this.handleOpenProjectClick.bind(this);
        this.removeProject = this.removeProject.bind(this);
    }

    private addEventListeners()
    {
        document.getElementById('save-project')?.addEventListener('click', this.saveProject);
        document.getElementById('open-project')?.addEventListener('click', this.handleOpenProjectClick);
    }

    private async saveProject()
    {
        const scene = this.app.game.scene.getScene('RightPanelScene') as RightPanelScene;
        const projectName = (document.getElementById('name') as HTMLInputElement).value || 'img';

        // Convert the reference image to DataURL if it exists
        let referenceImageUri = "";
        if (this.app.image.isLoaded)
        {
            referenceImageUri = this.app.imageCanvas.toDataURL();
        }

        const projectData: TProjectData = {
            referenceImage: this.app.image.isLoaded ? {
                uri: referenceImageUri,
                name: this.app.image.name
            } : null,
            settings: {
                canvasWidth: this.app.widthInput.value,
                canvasHeight: this.app.heightInput.value,
                grid: this.app.grid,
                frameRate: this.app.rangeElm.value,
                yoyo: (document.getElementById('yoyo') as HTMLInputElement)?.checked || false
            },
            frames: scene.frames.map((f) => ({
                uri: f.uri,
                isEnabled: f.isEnabled,
                name: f.name,
                offsetX: f.offsetX,
                offsetY: f.offsetY
            }))
        };

        // Save project data under its name
        await this.store.setItem(projectName, projectData);
        // Save only the name for the next session
        await this.store.setItem('last_session', projectName);

        alert(`Project "${projectName}" saved locally`);
    }

    private async handleOpenProjectClick(event: Event)
    {
        console.log("opening project: ");
        // On capture l'ID de la cible AVANT le await car l'event sera nettoyé après.
        const targetId = 'modal-projects'; // (event.currentTarget as HTMLElement).getAttribute("data-target") || "";
        event.preventDefault();

        const keys = await this.store.keys();
        const projectNames = keys.filter(key => key !== 'last_session');

        const listContainer = document.getElementById('project-list-items');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (projectNames.length === 0)
        {
            listContainer.innerHTML = '<li>No saved project.</li>';
        } 
        else
        {
            projectNames.forEach(name =>
            {
                const li = document.createElement('li');

                const btn = document.createElement('button');
                btn.textContent = name;
                btn.classList.add('outline', 'secondary', 'flex-space-between');
                btn.style.width = '100%';
                btn.style.minWidth = '300px';
                btn.style.textAlign = 'left';
                btn.style.marginBottom = '10px';
                btn.addEventListener('click', async () =>
                {
                    const data = await this.store.getItem<TProjectData>(name);
                    if (data)
                    {
                        await this.restoreData(data);
                        await this.store.setItem('last_session', name);
                        (document.getElementById('name') as HTMLInputElement).value = name;

                        // Fermer la modale manuellement après sélection
                        const modal = document.getElementById('modal-projects') as HTMLDialogElement;
                        if (modal) modal.open = false;
                    }
                }, { once: true });

                const deleteBtn = document.createElement('button');
                deleteBtn.title = `Delete project`;
                deleteBtn.role = "button";
                deleteBtn.classList.add('right');
                deleteBtn.innerHTML = deleteButtonSVG;
                deleteBtn.addEventListener('click', (event) => this.removeProject(event, name), { once: true });

                btn.appendChild(deleteBtn);
                li.appendChild(btn);
                listContainer.appendChild(li);
            });
        }

        this.app.openModal(targetId);
    }

    private async restoreLastSession()
    {
        const lastProjectName = await this.store.getItem<string>('last_session');
        if (lastProjectName)
        {
            const data = await this.store.getItem<TProjectData>(lastProjectName);
            if (data)
            {
                this.restoreData(data);
                (document.getElementById('name') as HTMLInputElement).value = lastProjectName;
            }
        }
    }

    private async restoreData(data: TProjectData)
    {
        // Restore Reference Image
        if (data.referenceImage)
        {
            this.app.loadReferenceImage(data.referenceImage.uri, data.referenceImage.name);
        }

        // Restore Settings
        if (data.settings)
        {
            this.app.widthInput.value = data.settings.canvasWidth;
            this.app.heightInput.value = data.settings.canvasHeight;
            this.app.grid = data.settings.grid;

            // UI grid sync
            this.app.gridSnapInput.checked = this.app.grid.isEnabled;
            this.app.gridWidthInput.value = this.app.grid.width.toString();
            this.app.gridHeightInput.value = this.app.grid.height.toString();
            this.app.gridOffXInput.value = this.app.grid.offsetX.toString();
            this.app.gridOffYInput.value = this.app.grid.offsetY.toString();

            this.app.rangeElm.value = data.settings.frameRate;
            (document.getElementById('yoyo') as HTMLInputElement).checked = data.settings.yoyo;

            this.app.startPhaser();
            this.app.updateGridState();

            const scene = this.app.game.scene.getScene('RightPanelScene') as RightPanelScene;

            // Supprimer proprement les textures de Phaser
            scene.frames.forEach((_, i) =>
            {
                if (scene.textures.exists(`img_${i}`))
                {
                    scene.textures.removeKey(`img_${i}`);
                }
            });

            scene.frames = [];
            scene.count = 0;
            this.app.framesInstance = [];
            document.getElementById('frame-list')!.innerHTML = '';

            // Restore Frames
            for (let i = 0; i < data.frames.length; i++)
            {
                const f = data.frames[i];
                const id = await scene.loadImage(f.uri, f.offsetX, f.offsetY);
                const frameUI = new FrameListElement(id, f.uri, scene, this.app.framesInstance);

                // Re-apply saved data to the UI and Model
                scene.frames[id].name = f.name;
                scene.frames[id].isEnabled = f.isEnabled;
                frameUI.updateUIFromData(f.offsetX, f.offsetY, f.name, f.isEnabled);

                this.app.framesInstance.push(frameUI);
            }
            scene.updateAnimationSelect();
        }
    }

    private async removeProject(event: Event, name: string)
    {
        event.stopPropagation();

        await this.store.removeItem(name);

        const modal = document.getElementById('modal-projects') as HTMLDialogElement;
        if (modal) modal.open = false;
        
        this.handleOpenProjectClick(event);
    }
}