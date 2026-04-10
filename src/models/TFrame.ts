import Phaser from "phaser";

export interface TFrame {
    texture: Phaser.Textures.CanvasTexture;
    uri: string;
    animFrame: Phaser.Types.Animations.AnimationFrame;
    isEnabled: boolean;
    name: string;
}
