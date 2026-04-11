export class GridCanvasService {
    /**
     * Draws a grid on the provided canvas context based on the given parameters.
     */
    public draw(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        offsetX: number,
        offsetY: number,
        color: string,
        boundsW: number,
        boundsH: number
    ): void {
        if (width <= 0 || height <= 0) return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        for (let x = offsetX; x <= boundsW; x += width) {
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, boundsH);
        }

        for (let y = offsetY; y <= boundsH; y += height) {
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(boundsW, y + 0.5);
        }
        ctx.stroke();
    }
}