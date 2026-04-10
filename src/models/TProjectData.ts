import { TGrid } from "./TGrid";

export interface TProjectData {
    referenceImage: {
        uri: string;
        name: string;
    } | null;
    settings: {
        canvasWidth: string;
        canvasHeight: string;
        grid: TGrid;
        frameRate: string;
        yoyo: boolean;
    };
    frames: {
        uri: string;
        isEnabled: boolean;
        name: string;
        offsetX: number;
        offsetY: number;
    }[];
}