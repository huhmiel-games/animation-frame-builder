import { RightPanelScene } from "./rightPanelScene";

export const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    parent: 'tilesetCanvas',
    width: 256,
    height: 256,
    pixelArt: true,
    transparent: true,
    autoRound: false,
    expandParent: true,
    input: {
        gamepad: false,
        mouse: true,
        windowEvents: true,
    },
    scale: {
        mode: Phaser.Scale.ScaleModes.NONE,
        autoRound: true,
        autoCenter: Phaser.Scale.Center.CENTER_HORIZONTALLY
    },
    scene: [RightPanelScene],
}

export const playButtonSVG = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6 18.4V5.6a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6v12.8a.6.6 0 01-.6.6H6.6a.6.6 0 01-.6-.6zM14 18.4V5.6a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6v12.8a.6.6 0 01-.6.6h-2.8a.6.6 0 01-.6-.6z" stroke="#eeeeee" stroke-width="1.5"></path></svg>';
export const pauseButtonSVG = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6.906 4.537A.6.6 0 006 5.053v13.894a.6.6 0 00.906.516l11.723-6.947a.6.6 0 000-1.032L6.906 4.537z" stroke="#eeeeee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
export const deleteButtonSVG = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M20 9l-1.995 11.346A2 2 0 0116.035 22h-8.07a2 2 0 01-1.97-1.654L4 9M21 6h-5.625M3 6h5.625m0 0V4a2 2 0 012-2h2.75a2 2 0 012 2v2m-6.75 0h6.75" stroke="#eeeeee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';