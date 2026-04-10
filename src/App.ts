import { config, pauseButtonSVG, playButtonSVG } from "./constant";
import { FrameListElement } from "./FrameListElement";
import { RightPanelScene } from "./rightPanelScene";
import type { TSelectedImageArea, TImage, TTileset, TGrid } from "./types";

export class App
{
    // Html elements
    saveTilesetBtn = document.getElementById('save-tileset') as HTMLButtonElement;
    imageElm = document.getElementById("image") as HTMLImageElement;
    widthInput = document.getElementById('width') as HTMLInputElement;
    heightInput = document.getElementById('height') as HTMLInputElement;
    imageCanvas = document.getElementById('imageCanvas') as HTMLCanvasElement;
    gridCanvas = document.getElementById('gridCanvas') as HTMLCanvasElement;
    redZone = document.getElementById("red-zone") as HTMLDivElement;
    floatingCanvas = document.getElementById('floating-canvas') as HTMLCanvasElement;
    leftPanel = document.getElementById('left-panel') as HTMLDivElement;
    playBtn = document.getElementById('play-anim') as HTMLButtonElement;
    rangeElm = document.getElementById('range') as HTMLInputElement;
    gridSnapInput = document.getElementById('grid-snap') as HTMLInputElement;
    gridWidthInput = document.getElementById('grid-width') as HTMLInputElement;
    gridHeightInput = document.getElementById('grid-height') as HTMLInputElement;
    gridOffXInput = document.getElementById('grid-offx') as HTMLInputElement;
    gridOffYInput = document.getElementById('grid-offy') as HTMLInputElement;

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
        isEnabled: this.gridSnapInput.checked,
        width: +this.gridWidthInput.value || 32,
        height: +this.gridHeightInput.value || 32,
        offsetX: +this.gridOffXInput.value || 0,
        offsetY: +this.gridOffYInput.value || 0
    };

    game: Phaser.Game = new Phaser.Game(config);

    visibleModal: HTMLElement | null = null;
    navbarHeight = document.querySelector('nav')?.clientHeight || 58;
    framesInstance: FrameListElement[] = [];

    constructor()
    {
        this.bind();
        this.addEventListeners();
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
    }

    bind()
    {
        this.openImage = this.openImage.bind(this);
        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.renderCanvas = this.renderCanvas.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.resetSelection = this.resetSelection.bind(this);
        this.resetRedZone = this.resetRedZone.bind(this);
        this.setRedZoneSize = this.setRedZoneSize.bind(this);
        this.placeRedZone = this.placeRedZone.bind(this);
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
    }

    addEventListeners()
    {
        // Event listeners
        document.getElementById('open-image')?.addEventListener('change', this.openImage, false);
        document.getElementById('about-btn')?.addEventListener('click', this.openModal, false);
        document.addEventListener('wheel', this.onMouseWheel, { passive: false });
        (document.querySelectorAll('[id ^= "close-"]')).forEach(elm => elm.addEventListener('click', this.closeModal));
        document.addEventListener('keydown', this.handleKeyPress);
        this.imageCanvas.addEventListener('mousedown', this.onImageCanvasMouseDown, false);
        this.imageCanvas.addEventListener('mouseup', this.onImageCanvasMouseUp, false);
        this.imageCanvas.addEventListener('contextmenu', this.resetSelection, false);
        this.leftPanel.addEventListener('mouseleave', (event) =>
        {
            if (this.selectedImageArea.isComplete || this.selectedImageArea.isDirty) return;

            this.leftPanel.removeEventListener('mousemove', this.handleMouseMove);
        });
        this.saveTilesetBtn.addEventListener('click', this.downloadTilesetAsImage, false);
        this.widthInput.addEventListener('change', this.startPhaser, false);
        this.heightInput.addEventListener('change', this.startPhaser, false);
        this.playBtn.addEventListener('click', this.playOrPause);
        this.rangeElm.addEventListener('change', this.changeFrameRate);
        document.getElementById('yoyo')?.addEventListener('change', this.setYoyo);
        this.gridSnapInput.addEventListener('change', this.updateGridState);
        this.gridWidthInput.addEventListener('input', this.updateGridState);
        this.gridHeightInput.addEventListener('input', this.updateGridState);
        this.gridOffXInput.addEventListener('input', this.updateGridState);
        this.gridOffYInput.addEventListener('input', this.updateGridState);
    }

    startPhaser()
    {
        if (+this.widthInput.value !== 0 && +this.heightInput.value !== 0)
        {
            config.width = +this.widthInput.value;
            config.height = +this.heightInput.value;
            this.game.scale.resize(config.width, config.height);
            const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
            scene.cameras.main.setViewport(0, 0, config.width, config.height);
            scene.sprite?.setPosition(config.width / 2, config.height / 2);
        }
    }

    setYoyo(event)
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        const anim = scene.anim;
        if (!anim) return;
        anim.yoyo = event.target.checked;
        scene.sprite?.anims.stop();
        scene.sprite?.anims.play('anim');
    }

    playOrPause()
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        const sprite = scene.sprite;
        if (!sprite) return;
        if (sprite.anims.isPlaying)
        {
            sprite.anims.stop();
            this.playBtn.innerHTML = pauseButtonSVG;
            return;
        }

        if (!sprite.anims.isPlaying)
        {
            sprite.anims.play('anim');
            this.playBtn.innerHTML = playButtonSVG;
            return;
        }
    }

    changeFrameRate(event)
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        scene.changeFrameRate(+event.target.value);
    }

    updateGridState()
    {
        this.grid.isEnabled = this.gridSnapInput.checked;
        this.grid.width = +this.gridWidthInput.value;
        this.grid.height = +this.gridHeightInput.value;
        this.grid.offsetX = +this.gridOffXInput.value;
        this.grid.offsetY = +this.gridOffYInput.value;
        this.renderCanvas();
    }

    // Settings
    openModal(event: Event | string)
    {
        let id: string | null = null;

        if (typeof event === 'string')
        {
            id = event;
        }
        else
        {
            event.preventDefault();
            id = (event.currentTarget as HTMLElement).getAttribute("data-target");
        }

        const modal = id ? document.getElementById(id) as HTMLDialogElement : null;
        if (modal)
        {
            modal.open = true;
            this.visibleModal = modal;
        }
    }

    closeModal(event)
    {
        this.visibleModal = null;
        event.preventDefault();
        const modal = document.getElementById(event.currentTarget.getAttribute("data-target")) as HTMLDialogElement;
        modal.open = false;
    }

    // Image canvas
    openImage(event)
    {
        const imageFiles = event.target.files;
        const imageFilesLength = imageFiles.length;
        if (imageFilesLength > 0)
        {
            const imageSrc = URL.createObjectURL(imageFiles[0]);
            this.loadReferenceImage(imageSrc, imageFiles[0].name);
        }
    }

    public loadReferenceImage(uri: string, name: string)
    {
        this.image.name = name;
        this.imageElm.src = uri;
        this.imageElm.addEventListener("load", () =>
        {
            this.image.width = this.imageElm.naturalWidth;
            this.image.height = this.imageElm.naturalHeight;
            this.imageCanvas.classList.remove('none');
            this.gridCanvas.classList.remove('none');
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

        const ctx = this.imageCanvas.getContext("2d");
        const gridCtx = this.gridCanvas.getContext("2d");
        if (!ctx || !gridCtx) return;

        // Sync canvas dimensions with image natural size
        this.imageCanvas.width = this.image.width;
        this.imageCanvas.height = this.image.height;
        this.gridCanvas.width = this.image.width;
        this.gridCanvas.height = this.image.height;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.imageElm, 0, 0);

        gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);

        // If custom grid is disabled, we show a subtle 8x8 white grid
        const width = this.grid.isEnabled ? this.grid.width : 8;
        const height = this.grid.isEnabled ? this.grid.height : 8;
        const offX = this.grid.isEnabled ? this.grid.offsetX : 0;
        const offY = this.grid.isEnabled ? this.grid.offsetY : 0;
        const color = this.grid.isEnabled ? "rgb(255, 0, 195)" : "rgba(255, 0, 195, 0.35)";

        this.drawGrid(gridCtx, width, height, offX, offY, color);
    }

    drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, offsetX: number, offsetY: number, color: string)
    {
        if (width <= 0 || height <= 0) return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = offsetX; x <= this.image.width; x += width)
        {
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, this.image.height);
        }

        // Horizontal lines
        for (let y = offsetY; y <= this.image.height; y += height)
        {
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(this.image.width, y + 0.5);
        }
        ctx.stroke();
    }

    async copy()
    {
        const imageCtx = this.imageCanvas.getContext('2d');
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

        this.floatingCanvas.width = +this.widthInput.value;
        this.floatingCanvas.height = +this.heightInput.value;

        const posX = this.floatingCanvas.width / 2 - this.selectedImageArea.data.width / 2;
        const posY = this.floatingCanvas.height / 2 - this.selectedImageArea.data.height / 2;

        const ctx = this.floatingCanvas.getContext('2d');
        ctx?.putImageData(this.selectedImageArea.data, posX, posY);

        const copiedImage = this.floatingCanvas.toDataURL();
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

        this.setRedZoneSize(this.selectedImageArea);
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
        this.redZone.style.width = '0px';
        this.redZone.style.height = '0px';

        this.placeRedZone(this.selectedImageArea.sx, this.selectedImageArea.sy);
        this.imageCanvas.addEventListener('mousemove', this.handleMouseMove, { once: false });
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
        this.setRedZoneSize(this.selectedImageArea);
        this.copy();
        this.imageCanvas.removeEventListener('mousemove', this.handleMouseMove);
    }

    downloadTilesetAsImage()
    {
        const scene = this.game.scene.getScene('RightPanelScene') as RightPanelScene;
        scene.saveAssets(0);
    }

    // Red zone
    placeRedZone(x_pos: string | number, y_pos: string | number)
    {
        if (this.selectedImageArea.isComplete) return;
        this.redZone.style.left = x_pos + 'px';
        this.redZone.style.top = y_pos + 'px';
    }

    setRedZoneSize(zone: TSelectedImageArea)
    {
        const x = Math.abs(zone.ex - zone.sx);
        const y = Math.abs(zone.ey - zone.sy);

        if (this.redZone.style.width !== x + 'px')
        {
            this.redZone.style.width = x + 'px';
        }

        if (this.redZone.style.height !== y + 'px')
        {
            this.redZone.style.height = y + 'px';
        }
    }

    resetRedZone()
    {
        this.redZone.style.width = '0px';
        this.redZone.style.height = '0px';
        this.redZone.style.left = '0px';
        this.redZone.style.top = '0px';
    }

    // Zoom
    onMouseWheel(event)
    {
        if (event.ctrlKey) event.preventDefault();

        // zoom image
        if (event.ctrlKey && event.target.id === 'imageCanvas' && this.image.isLoaded)
        {
            if (this.selectedImageArea.isComplete)
            {
                this.resetSelection(event);
            }

            let scrollX: number, scrollY: number;
            if (event.wheelDelta > 0)
            {
                if (this.image.zoom === 64) return;
                this.image.zoom = this.clamp(this.image.zoom * 2, 0, 64);
                scrollX = (event.offsetX - event.clientX / 2) * 2;
                scrollY = (event.offsetY - (event.clientY - this.navbarHeight) / 2) * 2;

            }
            else if (event.wheelDelta < 0)
            {
                if (this.image.zoom < 0.02) return;
                this.image.zoom /= 2;
                scrollX = (event.offsetX - event.clientX * 2) / 2;
                scrollY = (event.offsetY - (event.clientY - this.navbarHeight) * 2) / 2;
            }

            this.imageCanvas.style.width = this.image.width * this.image.zoom + 'px';
            this.imageCanvas.style.height = this.image.height * this.image.zoom + 'px';
            this.gridCanvas.style.width = this.image.width * this.image.zoom + 'px';
            this.gridCanvas.style.height = this.image.height * this.image.zoom + 'px';
            this.renderCanvas();
            this.leftPanel.scroll(scrollX, scrollY);
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
        this.resetRedZone();
        this.selectedImageArea.isComplete = false;
    }
}