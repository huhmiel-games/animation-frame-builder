import Phaser from "phaser";
import { TFrame } from "./models/TFrame";
import { App } from "./App";
import type { FileService } from "./FileService";

export class RightPanelScene extends Phaser.Scene
{
    frames: TFrame[] = [];
    sprite: Phaser.GameObjects.Sprite | null = null;
    anim: Phaser.Animations.Animation;
    count = 0;
    selectedAnimationName: string | null = null;
    private app: App;
    private fileService: FileService;

    constructor()
    {
        super({
            key: 'RightPanelScene',
        });
        this.handleWheel = this.handleWheel.bind(this);
        this.changeFrameRate = this.changeFrameRate.bind(this);
        this.offsetXY = this.offsetXY.bind(this);
        this.saveAssets = this.saveAssets.bind(this);
        this.toggleFrame = this.toggleFrame.bind(this);
        this.moveFrame = this.moveFrame.bind(this);
        this.syncGridMargins = this.syncGridMargins.bind(this);
        this.setSelectedAnimation = this.setSelectedAnimation.bind(this);
    }

    public init(data: { app: App, fileService: FileService }) {
        this.app = data.app;
        this.fileService = data.fileService;
    }

    public preload()
    {
        const anim = this.anims.create({
            key: 'anim',
            frames: [],
            frameRate: 8,
            repeat: -1,
        });

        if (anim)
        {
            this.anim = anim;
        }
    }

    public create()
    {
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel);

        // Synchronisation automatique des marges quand Phaser redimensionne ou recentre
        this.scale.on(Phaser.Scale.Events.RESIZE, this.syncGridMargins);

        // Premier rendu : on assure l'alignement dès que le moteur a "settled" le DOM
        this.events.once(Phaser.Renderer.Events.POST_RENDER, this.syncGridMargins);

        this.selectedAnimationName = ""; // Default to "All Frames"
        this.updateAnimationSelect(); // Initial population of the select dropdown
    }

    public update(time: number, delta: number): void
    {

    }

    public async loadImage(imageURI: string, offsetX: number = 0, offsetY: number = 0, idx?: number): Promise<number>
    {
        return new Promise((resolve) =>
        {
            const img = new Image();

            if (this.sprite === null)
            {
                this.sprite = this.add.sprite(this.cameras.main.width / 2, this.cameras.main.height / 2, 'wipSprite');
            }

            img.addEventListener('load', () =>
            {
                const key = idx !== undefined ? `img_${idx}` : `img_${this.count}`;

                // Suppression de l'ancienne texture si elle existe pour éviter la collision de clé
                if (this.textures.exists(key))
                {
                    this.textures.removeKey(key);
                }

                const canvasTexture = this.textures.createCanvas(key, this.scale.width, this.scale.height);
                if (!canvasTexture) throw new Error("Canvas texture failed");

                const ctx = canvasTexture.getContext();
                ctx.drawImage(img, offsetX, offsetY);
                canvasTexture.refresh();

                // If the sprite is currently displaying this frame, update its texture
                if (this.sprite && this.sprite.texture.key === key)
                {
                    this.sprite.setTexture(key);
                }

                if (idx !== undefined)
                {
                    this.frames[idx].texture = canvasTexture;
                    this.frames[idx].animFrame = { key: key, frame: 0 };
                    this.frames[idx].offsetX = offsetX;
                    this.frames[idx].offsetY = offsetY;
                }
                else
                {
                    this.frames.push({
                        texture: canvasTexture,
                        uri: imageURI,
                        animFrame: { key: key, frame: 0 },
                        isEnabled: true,
                        name: "",
                        offsetX: offsetX,
                        offsetY: offsetY
                    });
                    this.count += 1;
                }

                this.updateAnimationSelect();
                resolve(idx !== undefined ? idx : this.count - 1);
            }, { once: true });

            img.src = imageURI;
        });
    }

    private handleWheel(pointer: Phaser.Input.Pointer)
    {
        const event = pointer.event as WheelEvent;
        const parent = this.game.canvas.parentElement;
        if (!parent) return;

        if (event.ctrlKey)
        {
            // Logique de ZOOM
            const oldZoom = this.game.scale.zoom;
            let newZoom = oldZoom;

            if (event.deltaY > 0)
            {
                newZoom = Phaser.Math.Clamp(oldZoom * 0.5, 1, 64);
            }
            else if (event.deltaY < 0)
            {
                newZoom = Phaser.Math.Clamp(oldZoom * 2, 1, 64);
            }

            if (newZoom !== oldZoom)
            {
                const canvas = this.game.canvas;
                const oldCanvasOffset = canvas.offsetLeft;

                this.game.scale.setZoom(newZoom);

                const newCanvasOffset = canvas.offsetLeft;

                // App.ts will handle updating gui.gridCanvasRight based on syncGridMargins event
                // this.app.gui.gridCanvasRight.style.width = this.scale.width * newZoom + 'px';
                // this.app.gui.gridCanvasRight.style.height = this.scale.height * newZoom + 'px';

                // pointer.x/y sont les positions relatives internes au canvas
                parent.scrollLeft += pointer.x * (newZoom - oldZoom) + (newCanvasOffset - oldCanvasOffset);
                parent.scrollTop += pointer.y * (newZoom - oldZoom);
                this.syncGridMargins();
            }
        }
        else if (event.shiftKey)
        {
            // Scroll X (Horizontal)
            parent.scrollLeft += event.deltaY;
        }
        else
        {
            // Scroll Y (Vertical)
            parent.scrollTop += event.deltaY;
        }
    }

    public syncGridMargins()
    {
        const gameCanvas = this.game.canvas;
        if (!gameCanvas) return;

        // On attend le prochain cycle pour garantir que le navigateur a calculé 
        // la position finale du canvas de Phaser (évite le bug 141px vs 142px)
        requestAnimationFrame(() =>
        {
            this.events.emit('sync-ui-grid', gameCanvas.offsetLeft, gameCanvas.offsetTop, this.game.scale.zoom);
        });
    }

    public rebuildAnimation()
    {
        const frameRate = +this.app.gui.rangeElm.value || 8;
        const yoyo = this.app.gui.yoyoInput?.checked || false;
        let isPlaying: boolean = this.sprite?.anims.isPlaying;

        if (this.anims.exists('anim'))
        {
            this.anims.remove('anim');
        }

        let framesToPlay: Phaser.Types.Animations.AnimationFrame[];

        if (this.selectedAnimationName === "" || this.selectedAnimationName === null)
        { // "All Frames" selected or default
            framesToPlay = this.frames.filter(f => f.isEnabled).map(f => f.animFrame);
        }
        else if (this.selectedAnimationName)
        { // A specific animation name is selected
            framesToPlay = this.frames.filter(f => f.isEnabled && f.name === this.selectedAnimationName).map(f => f.animFrame);
        }
        else
        {
            framesToPlay = []; // No animation selected, so no frames to play
        }

        if (framesToPlay.length === 0)
        {
            this.sprite?.anims.stop();
            this.sprite?.setTexture('_DEFAULT');
            return;
        }

        this.anim = this.anims.create({
            key: 'anim',
            frames: framesToPlay,
            frameRate: frameRate,
            repeat: -1,
            yoyo: yoyo
        }) as Phaser.Animations.Animation;

        if (isPlaying)
        {
            this.sprite?.anims.play('anim');
            this.events.emit('animationStateChanged', true);
        }
        else if (this.sprite && (
            this.sprite.texture.key === '_DEFAULT' ||
            this.sprite.texture.key === '__MISSING' ||
            this.sprite.texture.key === 'wipSprite' ||
            this.sprite.texture.key === '__DEFAULT')
        )
        {
            // Si l'animation ne tourne pas et qu'on affiche une texture par défaut/temporaire,
            // on affiche la première frame de la sélection actuelle.
            this.sprite.setTexture(framesToPlay[0].key);
        }
    }

    public startAnimation() {
        if (this.sprite && !this.sprite.anims.isPlaying) {
            this.sprite.anims.play('anim');
            this.events.emit('animationStateChanged', true);
        }
    }

    public stopAnimation() {
        this.sprite?.anims.stop();
        this.events.emit('animationStateChanged', false);
    }

    public toggleFrame(idx: number, enabled: boolean)
    {
        this.frames[idx].isEnabled = enabled;
        this.rebuildAnimation();
    }

    public moveFrame(idx: number, direction: 'up' | 'down')
    {
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= this.frames.length) return;

        // Swap data in arrays
        [this.frames[idx], this.frames[targetIdx]] = [this.frames[targetIdx], this.frames[idx]];

        this.updateTextureKeys();
        this.rebuildAnimation();
    }

    private updateTextureKeys()
    {
        const tempPrefix = `reorder_${Date.now()}_`;
        this.frames.forEach((f) =>
        {
            this.textures.renameTexture(f.texture.key, tempPrefix + f.texture.key);
        });

        this.frames.forEach((f, i) =>
        {
            this.textures.renameTexture(f.texture.key, `img_${i}`);
            f.animFrame = { key: `img_${i}`, frame: 0 };
        });
    }

    public changeFrameRate(value: number)
    {
        if (this.anim) this.anim.frameRate = value;
        this.sprite?.anims.play('anim');
    }

    public offsetXY(id: number, x: number, y: number)
    {
        this.loadImage(this.frames[id].uri, x, y, id);
    }

    public updateAnimationSelect()
    {
        // Collect animation names
        const animationNames = new Set<string>();
        this.frames.forEach(frame =>
        {
            if (frame.name)
            {
                animationNames.add(frame.name);
            } // else if (frame.name === "") { animationNames.add("Unnamed"); } // Consider adding unnamed frames to a category
        });

        const sortedNames = Array.from(animationNames).sort();
        
        // Emit event for App.ts to update the GUI select element
        this.events.emit('animationListUpdated', sortedNames, this.selectedAnimationName || "");

        // Rebuild animation based on current selection
        this.rebuildAnimation();
    }

    public setSelectedAnimation(name: string) {
        this.selectedAnimationName = name;
        this.rebuildAnimation();
    }

    public async saveAllAssets()
    {
        this.fileService.clearTargetDirectory(); // Reset directory choice for a new export
        this.saveAssets(0); // Start recursive saving
    }

    // This is now a private helper for saveAllAssets
    private saveAssets(idx: number)
    {
        if (idx >= this.frames.length)
        {
            return;
        }

        // Skip disabled frames
        if (!this.frames[idx].isEnabled)
        {
            this.saveAssets(idx + 1);
            return;
        }

        const name = this.app.gui.nameInput.value || 'img';
        const key = this.frames[idx].animFrame.key;

        let frameName = this.frames[idx].name || '';
        if (frameName)
        {
            frameName = frameName.padStart(frameName.length + 1, '_');
        }

        this.sprite?.setTexture(key, 0);
        this.events.once(Phaser.Renderer.Events.RENDER, async () =>
        {
            const texture = this.game.canvas.toDataURL('image/png');
            const fileName = `${name}${frameName}_${idx}`;

            try {
                await this.fileService.saveImage(texture, fileName);
            } catch (error) {
                console.error("Failed to save asset:", fileName, error);
                // Optionally, emit an event to App.ts to show a notification
            }
            
            if (idx < this.frames.length - 1)
            {
                this.saveAssets(idx + 1);
            }
        }, this);
    }

    public removeFrame(idx: number)
    {
        this.stopAnimation(); // Stop animation and emit state change
        this.anim.removeFrameAt(idx);
        this.textures.removeKey(`img_${idx}`);
        this.frames.splice(idx, 1);
        this.count -= 1;

        this.updateTextureKeys();
        this.rebuildAnimation();
        this.updateAnimationSelect();

        if (this.frames.length === 0)
        {
            this.sprite?.setTexture('_DEFAULT');
        }
    }
}
