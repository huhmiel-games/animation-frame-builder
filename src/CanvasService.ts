import { Gui } from "./Gui";
import { GridCanvasService } from "./GridCanvasService";
import type { TImage, TGrid } from "./types";

export class CanvasService {
    constructor(private gui: Gui, private gridCanvasService: GridCanvasService) {}

    /**
     * Loads an image into the reference image element and updates metadata.
     */
    public loadReferenceImage(uri: string, imageMetadata: TImage): Promise<void> {
        return new Promise((resolve) => {
            this.gui.imageElm.src = uri;
            this.gui.imageElm.addEventListener("load", () => {
                imageMetadata.width = this.gui.imageElm.naturalWidth;
                imageMetadata.height = this.gui.imageElm.naturalHeight;
                imageMetadata.isLoaded = true;
                
                this.gui.imageCanvas.classList.remove('none');
                this.gui.gridCanvas.classList.remove('none');
                
                resolve();
            }, { once: true });
        });
    }

    /**
     * Renders the source image and its grid on the left panel canvases.
     */
    public renderSourceCanvas(imageMetadata: TImage, grid: TGrid): void {
        if (!imageMetadata.isLoaded) return;

        const ctx = this.gui.imageCanvas.getContext("2d");
        const gridCtx = this.gui.gridCanvas.getContext("2d");
        if (!ctx || !gridCtx) return;

        this.gui.imageCanvas.width = imageMetadata.width;
        this.gui.imageCanvas.height = imageMetadata.height;
        this.gui.gridCanvas.width = imageMetadata.width;
        this.gui.gridCanvas.height = imageMetadata.height;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.gui.imageElm, 0, 0);

        gridCtx.clearRect(0, 0, this.gui.gridCanvas.width, this.gui.gridCanvas.height);

        const width = grid.isEnabled ? grid.width : 8;
        const height = grid.isEnabled ? grid.height : 8;
        const offX = grid.isEnabled ? grid.offsetX : 0;
        const offY = grid.isEnabled ? grid.offsetY : 0;
        const color = "rgba(255, 0, 195, 0.35)";

        this.gridCanvasService.draw(gridCtx, width, height, offX, offY, color, imageMetadata.width, imageMetadata.height);
    }

    /**
     * Renders the preview grid for the right panel.
     */
    public renderRightGrid(width: number, height: number, gridSize: number, zoom: number): void {
        const gridCtx = this.gui.gridCanvasRight.getContext("2d");
        if (!gridCtx) return;

        this.gui.gridCanvasRight.width = width;
        this.gui.gridCanvasRight.height = height;
        this.gui.gridCanvasRight.classList.remove('none');

        this.gui.gridCanvasRight.style.width = width * zoom + 'px';
        this.gui.gridCanvasRight.style.height = height * zoom + 'px';
        this.gui.gridCanvasRight.style.display = 'block';

        gridCtx.clearRect(0, 0, width, height);
        const color = "rgba(255, 0, 195, 0.35)";

        this.gridCanvasService.draw(gridCtx, gridSize, gridSize, 0, 0, color, width, height);
    }
}