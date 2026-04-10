import localforage from "localforage";
import type { App } from "./App";
import type { RightPanelScene } from "./rightPanelScene";
import { FrameListElement } from "./FrameListElement";
import { TProjectData } from "./models/TProjectData";

export class ProjectManager
{
    private app: App;
    private store: LocalForage;


    constructor(app: any)
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
        this.handleFileOpen = this.handleFileOpen.bind(this);
    }

    private addEventListeners()
    {
        document.getElementById('save-project')?.addEventListener('click', this.saveProject);
        document.getElementById('open-project')?.addEventListener('change', this.handleFileOpen);
    }

    private async saveProject()
    {
        const scene = this.app.game.scene.getScene('RightPanelScene') as RightPanelScene;
        
        // Convert the reference image to DataURL if it exists
        let referenceImageUri = "";
        if (this.app.image.isLoaded) {
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

        await this.store.setItem('last_session', projectData);
        alert("Project saved locally");
    }

    private handleFileOpen(event: Event)
    {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = JSON.parse(e.target?.result as string) as TProjectData;
            this.restoreData(data);
        };
        reader.readAsText(file);
    }

    private async restoreLastSession()
    {
        const data = await this.store.getItem<TProjectData>('last_session');
        if (data) {
            this.restoreData(data);
        }
    }

    private async restoreData(data: TProjectData)
    {
        // Restore Reference Image
        if (data.referenceImage) {
            this.app.loadReferenceImage(data.referenceImage.uri, data.referenceImage.name);
        }

        // Restore Settings
        if (data.settings) {
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
            
            // Clear existing frames
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
        };
        //reader.readAsText(file);
    }
}