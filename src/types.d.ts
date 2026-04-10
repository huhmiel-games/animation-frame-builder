import type { TGrid } from "./models/TGrid";

export type TSelectedImageArea = {
    sx: number
    sy: number
    ex: number
    ey: number
    isDirty: boolean,
    isComplete: boolean,
    data: ImageData | undefined
}

export type TImage = {
    name: string,
    width: number
    height: number
    isLoaded: boolean,
    zoom: number,
    offsetX: number
    offsetY: number
}

export type TTileset = {
    name: string,
    width: number
    height: number
    isLoaded: boolean,
    zoom: number,
}

export { TGrid };