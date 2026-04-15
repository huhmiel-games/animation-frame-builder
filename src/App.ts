import { config, pauseButtonSVG, playButtonSVG } from "./constant/constant";
import { FrameListElement } from "./ui/FrameListElement";
import { RightPanelScene } from "./scenes/RightPanelScene";
import { Gui } from "./ui/Gui";
import type { TImage, TTileset, TGrid } from "./types";
import { FileService } from "./services/FileService";
import { SelectionManager } from "./managers/SelectionManager";
import { GridCanvasService } from "./services/GridCanvasService";
import { CanvasService } from "./services/CanvasService";

export class App
{
    public readonly gui = new Gui();
    public readonly selectionManager = new SelectionManager(this);
    public readonly gridCanvasService = new GridCanvasService();
    public readonly canvasService = new CanvasService(this.gui, this.gridCanvasService);

    image: TImage = {
        name: '',
        width: 0,
        height: 0,
        isLoaded: false,
        zoom: 1,
        offsetX: 0,
        offsetY: 0
    };

    tileset: TTileset = {
        name: '',
        width: 0,
        height: 0,
        isLoaded: false,
        zoom: 1,
    };

    grid: TGrid = {
        isEnabled: this.gui.gridSnapInput.checked,
        width: +this.gui.gridWidthInput.value || 32,
        height: +this.gui.gridHeightInput.value || 32,
        offsetX: +this.gui.gridOffXInput.value || 0,
        offsetY: +this.gui.gridOffYInput.value || 0
    };

    game: Phaser.Game = new Phaser.Game(config);
    fileService: FileService = new FileService();

    framesInstance: FrameListElement[] = [];

    constructor()
    {
        this.bind();
        // Manual scene addition to inject dependencies
        this.game.scene.add('RightPanelScene', RightPanelScene, true, { app: this, fileService: this.fileService });

        this.addEventListeners();

        // Listen to Phaser scene events to sync HTML overlay
        this.game.events.once('ready', () =>
        {
            const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
            scene.events.on('sync-ui-grid', (x: number, y: number, zoom: number) =>
            {
                this.gui.gridCanvasRight.style.left = (x + 1) + 'px';
                this.gui.gridCanvasRight.style.top = (y + 1) + 'px';
                this.gui.gridCanvasRight.style.width = (+this.gui.widthInput.value * zoom) + 'px';
                this.gui.gridCanvasRight.style.height = (+this.gui.heightInput.value * zoom) + 'px';
            });

            // Synchronisation immédiate au démarrage
            scene.syncGridMargins();

            scene.events.on('animationStateChanged', (isPlaying: boolean) =>
            {
                this.gui.playBtn.innerHTML = isPlaying ? playButtonSVG : pauseButtonSVG;
            });
            scene.events.on('animationListUpdated', (names: string[], selected: string) =>
            {
                this.updateAnimationSelectUI(names, selected);
            });
        });
    }

    bind()
    {
        this.openImage = this.openImage.bind(this);
        this.openModal = this.openModal.bind(this);
        this.renderCanvas = this.renderCanvas.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.clamp = this.clamp.bind(this);
        this.copy = this.copy.bind(this);
        this.downloadTilesetAsImage = this.downloadTilesetAsImage.bind(this);
        this.startPhaser = this.startPhaser.bind(this);
        this.playOrPause = this.playOrPause.bind(this);
        this.changeFrameRate = this.changeFrameRate.bind(this);
        this.setYoyo = this.setYoyo.bind(this);
        this.updateGridState = this.updateGridState.bind(this);
        this.renderRightGrid = this.renderRightGrid.bind(this);
    }

    addEventListeners()
    {
        this.gui.bindAppEvents({
            onOpenImage: (e: Event) => this.openImage(e),
            onAboutClick: (e: Event) => this.openModal(e),
            onWheel: (e: WheelEvent) => this.onMouseWheel(e),
            onKeyDown: this.handleKeyPress,
            onImageMouseDown: this.selectionManager.onMouseDown,
            onImageMouseUp: this.selectionManager.onMouseUp,
            onImageContextMenu: this.selectionManager.resetSelection,
            onLeftPanelMouseLeave: (event: MouseEvent) =>
            {
                if (this.selectionManager.area.isComplete || this.selectionManager.area.isDirty) return;
                this.gui.imageCanvas.removeEventListener('mousemove', this.selectionManager.handleMouseMove);
            },
            onSaveTilesetClick: this.downloadTilesetAsImage,
            onCanvasSizeChange: this.startPhaser,
            onPlayPauseClick: this.playOrPause,
            onFrameRateChange: this.changeFrameRate,
            onYoyoChange: this.setYoyo,
            onGridStateChange: this.updateGridState,
            onRightGridSizeInput: this.renderRightGrid,
            onNewProjectClick: () => this.newProject(),
            onSelectAnimChange: (e: Event) =>
            {
                const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
                scene.setSelectedAnimation((e.target as HTMLSelectElement).value);
            }
        }); // ProjectManager will bind its own events later
    }

    newProject()
    {
        // 1. Reset state
        this.image.isLoaded = false;
        this.image.name = '';
        this.framesInstance = [];

        // 2. Clear Left Panel UI
        const ctx = this.gui.imageCanvas.getContext('2d');
        ctx?.clearRect(0, 0, this.gui.imageCanvas.width, this.gui.imageCanvas.height);
        this.gui.imageCanvas.width = 0;
        this.gui.imageCanvas.height = 0;

        // clear red zone
        this.gui.redZone.style.width = '0px';
        this.gui.redZone.style.height = '0px';

        // 3. Clear Right Panel UI
        this.gui.frameList.innerHTML = '';
        this.gui.nameInput.value = '';

        // 4. Clear Phaser Scene
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        scene.clearScene();
    }

    startPhaser()
    {
        const w = +this.gui.widthInput.value;
        const h = +this.gui.heightInput.value;
        if (w !== 0 && h !== 0)
        {
            config.width = w;
            config.height = h;
            this.game.scale.resize(config.width, config.height);
            const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
            scene.cameras.main.setViewport(0, 0, w, h);
            scene.sprite?.setPosition(w / 2, h / 2);
            this.renderRightGrid();
        }
    }

    setYoyo(event)
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        const anim = scene.anim;
        if (!anim) return;
        anim.yoyo = (event.target as HTMLInputElement).checked;
        scene.rebuildAnimation(); // Rebuild to apply yoyo change
    }

    playOrPause()
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        if (scene.sprite?.anims.isPlaying)
        {
            scene.stopAnimation();
        } 
        else
        {
            scene.startAnimation();
        }
    }

    changeFrameRate(event)
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        scene.changeFrameRate(+event.target.value);
    }

    updateGridState()
    {
        this.grid.isEnabled = this.gui.gridSnapInput.checked; // This is for the left panel grid
        this.grid.width = +this.gui.gridWidthInput.value; // This is for the left panel grid
        this.grid.height = +this.gui.gridHeightInput.value; // This is for the left panel grid
        this.grid.offsetX = +this.gui.gridOffXInput.value; // This is for the left panel grid
        this.grid.offsetY = +this.gui.gridOffYInput.value; // This is for the left panel grid
        this.renderCanvas();
    }

    // Settings
    openModal(event: Event | string): void
    {
        if (typeof event === 'string')
        {
            this.gui.openModal(event);
        }
        else
        {
            const ev = event as Event;
            ev.preventDefault();
            const id = (ev.currentTarget as HTMLElement).getAttribute("data-target");
            if (id) this.gui.openModal(id);
        }
    }

    // Image canvas
    openImage(event: Event): void
    {
        const target = event.target as HTMLInputElement;
        const imageFiles = target.files;
        const imageFilesLength = imageFiles ? imageFiles.length : 0;
        if (imageFilesLength > 0)
        {
            const imageSrc = URL.createObjectURL(imageFiles[0]);
            this.loadReferenceImage(imageSrc, imageFiles[0].name);
        }
    }

    public loadReferenceImage(uri: string, name: string)
    {
        this.image.name = name;
        this.canvasService.loadReferenceImage(uri, this.image).then(() => {
            this.renderCanvas();
        });
    }

    /**
     * Clears the canvas, draws the source image, and overlays the grid.
     */
    renderCanvas()
    {
        this.canvasService.renderSourceCanvas(this.image, this.grid);
    }

    renderRightGrid()
    {
        const w = +this.gui.widthInput.value;
        const h = +this.gui.heightInput.value;
        const gridSize = +this.gui.frameGridSizeInput.value || 8;
        const zoom = this.game.scale.zoom;
        this.canvasService.renderRightGrid(w, h, gridSize, zoom);
    }

    async copy()
    {
        const imageCtx = this.gui.imageCanvas.getContext('2d');
        if (!imageCtx) return;

        try
        {
            this.selectionManager.area.data = imageCtx.getImageData(
                this.selectionManager.area.sx / this.image.zoom,
                this.selectionManager.area.sy / this.image.zoom,
                (this.selectionManager.area.ex - this.selectionManager.area.sx) / this.image.zoom,
                (this.selectionManager.area.ey - this.selectionManager.area.sy) / this.image.zoom
            );
        }
        catch (error)
        {
            alert('Select a zone first');
            return;
        }

        this.gui.floatingCanvas.width = +this.gui.widthInput.value;
        this.gui.floatingCanvas.height = +this.gui.heightInput.value;

        const posX = this.gui.floatingCanvas.width / 2 - this.selectionManager.area.data!.width / 2;
        const posY = this.gui.floatingCanvas.height / 2 - this.selectionManager.area.data!.height / 2;

        const ctx = this.gui.floatingCanvas.getContext('2d');
        ctx?.putImageData(this.selectionManager.area.data!, posX, posY);

        const copiedImage = this.gui.floatingCanvas.toDataURL();
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        const id = await scene.loadImage(copiedImage);
        const newFrame = new FrameListElement(id, copiedImage, scene, this, this.framesInstance);
        this.framesInstance.push(newFrame);
    }

    downloadTilesetAsImage()
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        scene.saveAllAssets();
    }

    // Zoom
    onMouseWheel(event: WheelEvent): void
    {
        if (event.ctrlKey) event.preventDefault();

        // zoom image
        if (event.ctrlKey && (event.target as HTMLElement)?.id === 'imageCanvas' && this.image.isLoaded)
        {
            if (this.selectionManager.area.isComplete)
            {
                this.selectionManager.resetSelection(event);
            }

            let scrollX: number, scrollY: number;
            if (event.deltaY < 0) // Zoom In (Scroll Up)
            {
                if (this.image.zoom === 64) return;
                this.image.zoom = this.clamp(this.image.zoom * 2, 0, 64);
                scrollX = (event.offsetX - event.clientX / 2) * 2;
                scrollY = (event.offsetY - (event.clientY - this.gui.navbarHeight) / 2) * 2;

            }
            else if (event.deltaY > 0) // Zoom Out (Scroll Down)
            {
                if (this.image.zoom < 0.02) return;
                this.image.zoom /= 2;
                scrollX = (event.offsetX - event.clientX * 2) / 2;
                scrollY = (event.offsetY - (event.clientY - this.gui.navbarHeight) * 2) / 2;
            }

            this.gui.imageCanvas.style.width = this.image.width * this.image.zoom + 'px';
            this.gui.imageCanvas.style.height = this.image.height * this.image.zoom + 'px';
            this.gui.gridCanvas.style.width = this.image.width * this.image.zoom + 'px';
            this.gui.gridCanvas.style.height = this.image.height * this.image.zoom + 'px';
            this.renderCanvas();
            this.gui.leftPanel.scroll(scrollX, scrollY);
        }
    }

    // Key press
    handleKeyPress(event: KeyboardEvent)
    {

        if (event.ctrlKey && event.key === 's' && this.tileset.isLoaded)
        {
            event.preventDefault();
            this.downloadTilesetAsImage();
            return;
        }
    }

    // Utils
    clamp(number: number, min: number, max: number)
    {
        return Math.max(min, Math.min(number, max));
    }

    /**
     * Updates the animation select dropdown in the GUI.
     * This method is called by RightPanelScene via an event.
     */
    private updateAnimationSelectUI(animationNames: string[], selectedName: string)
    {
        this.gui.selectAnim.innerHTML = ''; // Clear all options

        const allOption = document.createElement('option');
        allOption.value = "";
        allOption.textContent = "All Frames";
        this.gui.selectAnim.appendChild(allOption);

        animationNames.forEach(name =>
        {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.gui.selectAnim.appendChild(option);
        });

        this.gui.selectAnim.value = selectedName;
    }
}