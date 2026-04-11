import { config, pauseButtonSVG, playButtonSVG } from "./constant";
import { FrameListElement } from "./FrameListElement";
import { RightPanelScene } from "./rightPanelScene";
import { Gui } from "./Gui";
import type { TSelectedImageArea, TImage, TTileset, TGrid } from "./types";
import { FileService } from "./FileService";

export class App
{
    public readonly gui = new Gui();

    // Data
    selectedImageArea: TSelectedImageArea = {
        sx: 0,
        sy: 0,
        ex: 0,
        ey: 0,
        isDirty: false,
        isComplete: false,
        data: undefined
    };

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
    fileService: FileService;

    framesInstance: FrameListElement[] = [];

    constructor()
    {
        this.bind();
        this.addEventListeners();
        this.fileService = new FileService();
        (this.game as any).app = this; // Shared instance for Phaser scenes

        // Listen to Phaser scene events to sync HTML overlay
        this.game.events.once('ready', () => {
            const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
            scene.events.on('sync-ui-grid', (x: number, y: number, zoom: number) => {
                this.gui.gridCanvasRight.style.left = (x + 1) + 'px';
                this.gui.gridCanvasRight.style.top = (y + 1) + 'px';
                this.gui.gridCanvasRight.style.width = (+this.gui.widthInput.value * zoom) + 'px';
                this.gui.gridCanvasRight.style.height = (+this.gui.heightInput.value * zoom) + 'px';
            });
            
            // Synchronisation immédiate au démarrage
            scene.syncGridMargins();

            scene.events.on('animationStateChanged', (isPlaying: boolean) => {
                this.gui.playBtn.innerHTML = isPlaying ? playButtonSVG : pauseButtonSVG;
            });
            scene.events.on('animationListUpdated', (names: string[], selected: string) => {
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
        this.resetSelection = this.resetSelection.bind(this);
        this.clamp = this.clamp.bind(this);
        this.resetZone = this.resetZone.bind(this);
        this.copy = this.copy.bind(this);
        this.getGridSnappedCoord = this.getGridSnappedCoord.bind(this);
        this.onImageCanvasMouseDown = this.onImageCanvasMouseDown.bind(this);
        this.onImageCanvasMouseUp = this.onImageCanvasMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
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
            onImageMouseDown: this.onImageCanvasMouseDown,
            onImageMouseUp: this.onImageCanvasMouseUp,
            onImageContextMenu: this.resetSelection,
            onLeftPanelMouseLeave: (event: MouseEvent) => {
                if (this.selectedImageArea.isComplete || this.selectedImageArea.isDirty) return;
                this.gui.imageCanvas.removeEventListener('mousemove', this.handleMouseMove);
            },
            onSaveTilesetClick: this.downloadTilesetAsImage,
            onCanvasSizeChange: this.startPhaser,
            onPlayPauseClick: this.playOrPause,
            onFrameRateChange: this.changeFrameRate,
            onYoyoChange: this.setYoyo,
            onGridStateChange: this.updateGridState,
            onRightGridSizeInput: this.renderRightGrid,
            onSelectAnimChange: (e: Event) => {
                const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
                scene.setSelectedAnimation((e.target as HTMLSelectElement).value);
            }
        }); // ProjectManager will bind its own events later

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
        if (scene.sprite?.anims.isPlaying) {
            scene.stopAnimation();
        } else {
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
        this.gui.imageElm.src = uri;
        this.gui.imageElm.addEventListener("load", () =>
        {
            this.image.width = this.gui.imageElm.naturalWidth;
            this.image.height = this.gui.imageElm.naturalHeight;
            this.gui.imageCanvas.classList.remove('none');
            this.gui.gridCanvas.classList.remove('none');
            this.image.isLoaded = true;
            this.renderCanvas();
        }, { once: true });
    }

    /**
     * Clears the canvas, draws the source image, and overlays the grid.
     */
    renderCanvas()
    {
        if (!this.image.isLoaded) return;

        const ctx = this.gui.imageCanvas.getContext("2d");
        const gridCtx = this.gui.gridCanvas.getContext("2d");
        if (!ctx || !gridCtx) return;

        // Sync canvas dimensions with image natural size
        this.gui.imageCanvas.width = this.image.width;
        this.gui.imageCanvas.height = this.image.height;
        this.gui.gridCanvas.width = this.image.width;
        this.gui.gridCanvas.height = this.image.height;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.gui.imageElm, 0, 0);

        gridCtx.clearRect(0, 0, this.gui.gridCanvas.width, this.gui.gridCanvas.height);

        // If custom grid is disabled, we show a subtle 8x8 white grid
        const width = this.grid.isEnabled ? this.grid.width : 8;
        const height = this.grid.isEnabled ? this.grid.height : 8;
        const offX = this.grid.isEnabled ? this.grid.offsetX : 0;
        const offY = this.grid.isEnabled ? this.grid.offsetY : 0;
        const color = "rgba(255, 0, 195, 0.35)";

        this.drawGrid(gridCtx, width, height, offX, offY, color);
    }

    renderRightGrid()
    {
        const gridCtx = this.gui.gridCanvasRight.getContext("2d");
        if (!gridCtx) return;

        const w = +this.gui.widthInput.value;
        const h = +this.gui.heightInput.value;

        this.gui.gridCanvasRight.width = w;
        this.gui.gridCanvasRight.height = h;
        this.gui.gridCanvasRight.classList.remove('none');

        // Synchronisation de la taille d'affichage avec le zoom actuel de Phaser
        const zoom = this.game.scale.zoom;
        this.gui.gridCanvasRight.style.width = w * zoom + 'px';
        this.gui.gridCanvasRight.style.height = h * zoom + 'px';
        this.gui.gridCanvasRight.style.display = 'block';

        gridCtx.clearRect(0, 0, w, h);

        // La grille de droite est indépendante : carrée et sans offset
        const gridSize = +this.gui.frameGridSizeInput.value || 8;
        const color = "rgba(255, 0, 195, 0.35)";

        this.drawGrid(gridCtx, gridSize, gridSize, 0, 0, color, w, h);
    }

    drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, offsetX: number, offsetY: number, color: string, boundsW?: number, boundsH?: number)
    {
        if (width <= 0 || height <= 0) return;
        const bW = boundsW ?? this.image.width;
        const bH = boundsH ?? this.image.height;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = offsetX; x <= bW; x += width)
        {
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, bH);
        }

        // Horizontal lines
        for (let y = offsetY; y <= bH; y += height)
        {
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(bW, y + 0.5);
        }
        ctx.stroke();
    }

    async copy()
    {
        const imageCtx = this.gui.imageCanvas.getContext('2d');
        if (!imageCtx) return;

        try
        {
            this.selectedImageArea.data = imageCtx.getImageData(
                this.selectedImageArea.sx / this.image.zoom,
                this.selectedImageArea.sy / this.image.zoom,
                (this.selectedImageArea.ex - this.selectedImageArea.sx) / this.image.zoom,
                (this.selectedImageArea.ey - this.selectedImageArea.sy) / this.image.zoom
            );
        }
        catch (error)
        {
            alert('Select a zone first');
            return;
        }

        this.gui.floatingCanvas.width = +this.gui.widthInput.value;
        this.gui.floatingCanvas.height = +this.gui.heightInput.value;

        const posX = this.gui.floatingCanvas.width / 2 - this.selectedImageArea.data.width / 2;
        const posY = this.gui.floatingCanvas.height / 2 - this.selectedImageArea.data.height / 2;

        const ctx = this.gui.floatingCanvas.getContext('2d');
        ctx?.putImageData(this.selectedImageArea.data, posX, posY);

        const copiedImage = this.gui.floatingCanvas.toDataURL();
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        const id = await scene.loadImage(copiedImage);
        const newFrame = new FrameListElement(id, copiedImage, scene, this.framesInstance);
        this.framesInstance.push(newFrame);
    }

    /**
     * Calculates the nearest grid coordinate based on the grid settings.
     * @param pos Current mouse position in image pixels
     * @param step Grid cell size (width or height)
     * @param offset Grid offset (X or Y)
     * @param isEnd Whether we are snapping the end of a selection (ceil) or the start (floor)
     */
    getGridSnappedCoord(pos: number, step: number, offset: number, isEnd: boolean = false): number
    {
        const val = (pos - offset) / step;
        const snapped = isEnd ? Math.ceil(val) : Math.floor(val);
        return snapped * step + offset;
    }

     /**
     * 
     * @param event handleMouseMove never worked so we return, will be fixed later
     * @returns 
     */
    public handleMouseMove(event: MouseEvent): void
    {
        if (
            this.selectedImageArea.isDirty === false ||
            this.image.isLoaded === false ||
            this.selectedImageArea.isComplete === true
        ) return;

        // Convert display pixels to image pixels
        const imgX = (event.offsetX / this.image.zoom) - this.image.offsetX;
        const imgY = (event.offsetY / this.image.zoom) - this.image.offsetY;

        // Snap settings: use custom grid if enabled, otherwise fallback to 8px grid
        const snapW = this.grid.isEnabled ? this.grid.width : 8;
        const snapH = this.grid.isEnabled ? this.grid.height : 8;
        const offX = this.grid.isEnabled ? this.grid.offsetX : 0;
        const offY = this.grid.isEnabled ? this.grid.offsetY : 0;

        const finalX = this.getGridSnappedCoord(imgX, snapW, offX, true);
        const finalY = this.getGridSnappedCoord(imgY, snapH, offY, true);

        this.selectedImageArea.ex = finalX * this.image.zoom;
        this.selectedImageArea.ey = finalY * this.image.zoom;

        this.gui.setRedZoneSize(
            Math.abs(this.selectedImageArea.ex - this.selectedImageArea.sx),
            Math.abs(this.selectedImageArea.ey - this.selectedImageArea.sy)
        );
    }

    onImageCanvasMouseDown(event: MouseEvent)
    {
        if (this.image.isLoaded === false || event.button !== 0) return;

        if (this.selectedImageArea.isComplete)
        {
            this.resetSelection(event);
        }

        // Convert display pixels to image pixels
        const imgX = (event.offsetX / this.image.zoom) - this.image.offsetX;
        const imgY = (event.offsetY / this.image.zoom) - this.image.offsetY;

        // Snap settings: use custom grid if enabled, otherwise fallback to 8px grid
        const snapW = this.grid.isEnabled ? this.grid.width : 8;
        const snapH = this.grid.isEnabled ? this.grid.height : 8;
        const offX = this.grid.isEnabled ? this.grid.offsetX : 0;
        const offY = this.grid.isEnabled ? this.grid.offsetY : 0;

        const finalX = this.getGridSnappedCoord(imgX, snapW, offX);
        const finalY = this.getGridSnappedCoord(imgY, snapH, offY);

        this.selectedImageArea.sx = finalX * this.image.zoom;
        this.selectedImageArea.sy = finalY * this.image.zoom;

        this.selectedImageArea.isDirty = true;
        this.gui.setRedZoneSize(0, 0);

        this.gui.setRedZonePosition(this.selectedImageArea.sx, this.selectedImageArea.sy);
        this.gui.imageCanvas.addEventListener('mousemove', this.handleMouseMove, { once: false });
    }

    onImageCanvasMouseUp(event: MouseEvent)
    {
        if (
            this.selectedImageArea.isDirty === false ||
            this.image.isLoaded === false ||
            this.selectedImageArea.isComplete === true ||
            event.button !== 0
        ) return;

        // Convert display pixels to image pixels
        const imgX = (event.offsetX / this.image.zoom) - this.image.offsetX;
        const imgY = (event.offsetY / this.image.zoom) - this.image.offsetY;

        // Snap settings: use custom grid if enabled, otherwise fallback to 8px grid
        const snapW = this.grid.isEnabled ? this.grid.width : 8;
        const snapH = this.grid.isEnabled ? this.grid.height : 8;
        const offX = this.grid.isEnabled ? this.grid.offsetX : 0;
        const offY = this.grid.isEnabled ? this.grid.offsetY : 0;

        const finalX = this.getGridSnappedCoord(imgX, snapW, offX, true);
        const finalY = this.getGridSnappedCoord(imgY, snapH, offY, true);

        this.selectedImageArea.ex = finalX * this.image.zoom;
        this.selectedImageArea.ey = finalY * this.image.zoom;

        this.selectedImageArea.isComplete = true;
        this.gui.setRedZoneSize(Math.abs(this.selectedImageArea.ex - this.selectedImageArea.sx), Math.abs(this.selectedImageArea.ey - this.selectedImageArea.sy));
        this.copy();
        this.gui.imageCanvas.removeEventListener('mousemove', this.handleMouseMove);
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
            if (this.selectedImageArea.isComplete)
            {
                this.resetSelection(event);
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
    resetZone()
    {
        this.selectedImageArea.sx = 0;
        this.selectedImageArea.sy = 0;
        this.selectedImageArea.ex = 0;
        this.selectedImageArea.ey = 0;
        this.selectedImageArea.isDirty = false;
    }

    clamp(number: number, min: number, max: number)
    {
        return Math.max(min, Math.min(number, max));
    }

    resetSelection(event: MouseEvent)
    {
        event.stopPropagation();
        event.preventDefault();
        this.resetZone();
        this.gui.setRedZoneSize(0, 0);
        this.selectedImageArea.isComplete = false;
    }

    /**
     * Updates the animation select dropdown in the GUI.
     * This method is called by RightPanelScene via an event.
     */
    private updateAnimationSelectUI(animationNames: string[], selectedName: string) {
        this.gui.selectAnim.innerHTML = ''; // Clear all options

        const allOption = document.createElement('option');
        allOption.value = "";
        allOption.textContent = "All Frames";
        this.gui.selectAnim.appendChild(allOption);

        animationNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.gui.selectAnim.appendChild(option);
        });

        this.gui.selectAnim.value = selectedName;
    }
}