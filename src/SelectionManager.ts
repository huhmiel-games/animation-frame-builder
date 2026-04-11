import { App } from "./App";
import { TSelectedImageArea } from "./types";

export class SelectionManager {
    public area: TSelectedImageArea = {
        sx: 0,
        sy: 0,
        ex: 0,
        ey: 0,
        isDirty: false,
        isComplete: false,
        data: undefined
    };

    constructor(private app: App) {
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.resetSelection = this.resetSelection.bind(this);
    }

    /**
     * Calculates the nearest grid coordinate based on the grid settings.
     */
    public getGridSnappedCoord(pos: number, step: number, offset: number, isEnd: boolean = false): number {
        const val = (pos - offset) / step;
        const snapped = isEnd ? Math.ceil(val) : Math.floor(val);
        return snapped * step + offset;
    }

    public handleMouseMove(event: MouseEvent): void {
        if (
            this.area.isDirty === false ||
            this.app.image.isLoaded === false ||
            this.area.isComplete === true
        ) return;

        // Convert display pixels to image pixels
        const imgX = (event.offsetX / this.app.image.zoom) - this.app.image.offsetX;
        const imgY = (event.offsetY / this.app.image.zoom) - this.app.image.offsetY;

        // Snap settings: use custom grid if enabled, otherwise fallback to 8px grid
        const snapW = this.app.grid.isEnabled ? this.app.grid.width : 8;
        const snapH = this.app.grid.isEnabled ? this.app.grid.height : 8;
        const offX = this.app.grid.isEnabled ? this.app.grid.offsetX : 0;
        const offY = this.app.grid.isEnabled ? this.app.grid.offsetY : 0;

        const finalX = this.getGridSnappedCoord(imgX, snapW, offX, true);
        const finalY = this.getGridSnappedCoord(imgY, snapH, offY, true);

        this.area.ex = finalX * this.app.image.zoom;
        this.area.ey = finalY * this.app.image.zoom;

        this.app.gui.setRedZoneSize(
            Math.abs(this.area.ex - this.area.sx),
            Math.abs(this.area.ey - this.area.sy)
        );
    }

    public onMouseDown(event: MouseEvent) {
        if (this.app.image.isLoaded === false || event.button !== 0) return;

        if (this.area.isComplete) {
            this.resetSelection(event);
        }

        const imgX = (event.offsetX / this.app.image.zoom) - this.app.image.offsetX;
        const imgY = (event.offsetY / this.app.image.zoom) - this.app.image.offsetY;

        const snapW = this.app.grid.isEnabled ? this.app.grid.width : 8;
        const snapH = this.app.grid.isEnabled ? this.app.grid.height : 8;
        const offX = this.app.grid.isEnabled ? this.app.grid.offsetX : 0;
        const offY = this.app.grid.isEnabled ? this.app.grid.offsetY : 0;

        const finalX = this.getGridSnappedCoord(imgX, snapW, offX);
        const finalY = this.getGridSnappedCoord(imgY, snapH, offY);

        this.area.sx = finalX * this.app.image.zoom;
        this.area.sy = finalY * this.app.image.zoom;

        this.area.isDirty = true;
        this.app.gui.setRedZoneSize(0, 0);
        this.app.gui.setRedZonePosition(this.area.sx, this.area.sy);
        this.app.gui.imageCanvas.addEventListener('mousemove', this.handleMouseMove);
    }

    public onMouseUp(event: MouseEvent) {
        if (
            this.area.isDirty === false ||
            this.app.image.isLoaded === false ||
            this.area.isComplete === true ||
            event.button !== 0
        ) return;

        const imgX = (event.offsetX / this.app.image.zoom) - this.app.image.offsetX;
        const imgY = (event.offsetY / this.app.image.zoom) - this.app.image.offsetY;

        const snapW = this.app.grid.isEnabled ? this.app.grid.width : 8;
        const snapH = this.app.grid.isEnabled ? this.app.grid.height : 8;
        const offX = this.app.grid.isEnabled ? this.app.grid.offsetX : 0;
        const offY = this.app.grid.isEnabled ? this.app.grid.offsetY : 0;

        const finalX = this.getGridSnappedCoord(imgX, snapW, offX, true);
        const finalY = this.getGridSnappedCoord(imgY, snapH, offY, true);

        this.area.ex = finalX * this.app.image.zoom;
        this.area.ey = finalY * this.app.image.zoom;

        this.area.isComplete = true;
        this.app.gui.setRedZoneSize(Math.abs(this.area.ex - this.area.sx), Math.abs(this.area.ey - this.area.sy));
        this.app.copy();
        this.app.gui.imageCanvas.removeEventListener('mousemove', this.handleMouseMove);
    }

    public resetSelection(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        this.area = { ...this.area, sx: 0, sy: 0, ex: 0, ey: 0, isDirty: false, isComplete: false };
        this.app.gui.setRedZoneSize(0, 0);
    }
}