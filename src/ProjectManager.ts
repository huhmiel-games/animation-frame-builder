import type { App } from "./App";
import type { RightPanelScene } from "./rightPanelScene";
import { FrameListElement } from "./FrameListElement";
import { TProjectData } from "./models/TProjectData";
import { deleteButtonSVG } from "./constant";
import { DatabaseService } from "./DatabaseService";

export class ProjectManager
{
    private app: App;
    private db: DatabaseService;

    constructor(app: App)
    {
        this.app = app;
        this.db = new DatabaseService();
        this.bind();
        this.addEventListeners();
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
        this.app.gui.saveProjectBtn?.addEventListener('click', this.saveProject);
        this.app.gui.openProjectBtn?.addEventListener('click', this.handleOpenProjectClick);
    }

    private async saveProject()
    {
        const scene = this.app.game.scene.getScene('RightPanelScene') as RightPanelScene;
        const projectName = this.app.gui.nameInput.value || 'img';

        // Convert the reference image to DataURL if it exists
        let referenceImageUri = "";
        if (this.app.image.isLoaded)
        {
            referenceImageUri = this.app.gui.imageCanvas.toDataURL('image/png');
        }

        const projectData: TProjectData = {
            referenceImage: this.app.image.isLoaded ? {
                uri: referenceImageUri,
                name: this.app.image.name
            } : null,
            settings: {
                ...this.app.gui.getProjectSettings(),
                grid: this.app.grid,
            },
            frames: scene.frames.map((f) => ({
                uri: f.uri,
                isEnabled: f.isEnabled,
                name: f.name,
                offsetX: f.offsetX,
                offsetY: f.offsetY
            }))
        };

        await this.db.saveProject(projectName, projectData);

        alert(`Project "${projectName}" saved locally`);
    }

    private async handleOpenProjectClick(event: Event)
    {
        event.preventDefault();
        const projectNames = await this.db.getAllProjectNames();

        this.app.gui.renderProjectList(
            projectNames,
            async (name) =>
            {
                const data = await this.db.getProject(name);
                if (data)
                {
                    await this.restoreData(data);
                    await this.db.setLastProjectName(name);
                    this.app.gui.nameInput.value = name;
                    this.app.gui.modalProjects.open = false;
                }
            },
            async (name, e) =>
            {
                await this.removeProject(e, name);
            },
            deleteButtonSVG
        );

        this.app.gui.openModal('modal-projects');
    }

    private async restoreLastSession()
    {
        const lastProjectName = await this.db.getLastProjectName();
        if (lastProjectName)
        {
            const data = await this.db.getProject(lastProjectName);
            if (data)
            {
                this.restoreData(data);
                this.app.gui.nameInput.value = lastProjectName;
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
            this.app.grid = data.settings.grid;
            this.app.gui.applyProjectSettings(data.settings);

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
            this.app.gui.frameList!.innerHTML = '';

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

        await this.db.deleteProject(name);
        this.app.gui.modalProjects.open = false;
        
        this.handleOpenProjectClick(event);
    }
}