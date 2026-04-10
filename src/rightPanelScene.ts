import Phaser from "phaser";
import { pauseButtonSVG, playButtonSVG } from "./constant";
import { TFrame } from "./models/TFrame";

export class RightPanelScene extends Phaser.Scene
{
    frames: TFrame[] = [];
    sprite: Phaser.GameObjects.Sprite | null = null;
    anim: Phaser.Animations.Animation;
    count: number = 0;
    selectedAnimationName: string | null = null;
    playBtn: HTMLButtonElement;
    selectAnimElement: HTMLSelectElement;

    constructor()
    {
        super({
            key: 'RightPanelScene',
        });
        this.playBtn = document.getElementById('play-anim') as HTMLButtonElement;
        this.handleZoom = this.handleZoom.bind(this);
        this.changeFrameRate = this.changeFrameRate.bind(this);
        this.offsetXY = this.offsetXY.bind(this);
        this.saveAssets = this.saveAssets.bind(this);
        this.toggleFrame = this.toggleFrame.bind(this);
        this.moveFrame = this.moveFrame.bind(this);
        this.selectAnimElement = document.getElementById('select-anim') as HTMLSelectElement;
        this.handleAnimationSelectChange = this.handleAnimationSelectChange.bind(this);
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
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleZoom);
        this.selectAnimElement.addEventListener('change', this.handleAnimationSelectChange);
        this.updateAnimationSelect(); // Initial population of the select dropdown
    }

    public update(time: number, delta: number): void
    {

    }

    public async loadImage(imageURI: string, offsetX: number = 0, offsetY: number = 0, idx?: number): Promise<number>
    {
        const img = new Image();

        if (this.sprite === null)
        {
            this.sprite = this.add.sprite(this.cameras.main.width / 2, this.cameras.main.height / 2, 'wipSprite');
        }

        img.addEventListener('load', async () =>
        {
            if (idx !== undefined)
            {
                this.textures.removeKey(`img_${idx}`);
                const canvasTexture = this.textures.createCanvas(`img_${idx}`, this.scale.width, this.scale.height);
                if (!canvasTexture) throw new Error("Canvas texture failed");

                const ctx = canvasTexture.getContext();
                ctx.drawImage(img, offsetX, offsetY);
                canvasTexture.refresh();

                this.frames[idx].texture = canvasTexture;
                this.frames[idx].animFrame = { key: `img_${idx}`, frame: 0 };

                this.anim.removeFrameAt(idx);
                const modifiedFrame = this.frames[idx].animFrame;
                if (!modifiedFrame) throw new Error("Texture modification failed");
                this.sprite?.setTexture(`img_${idx}`, 0);
                this.anim.addFrameAt(idx, [modifiedFrame]);
                this.updateAnimationSelect();
            }
            else
            {
                const canvasTexture = this.textures.createCanvas(`img_${this.count}`, this.scale.width, this.scale.height);
                if (!canvasTexture) throw new Error("Canvas texture failed");

                const ctx = canvasTexture.getContext();
                ctx.drawImage(img, offsetX, offsetY);
                canvasTexture.refresh();

                this.frames.push({
                    texture: canvasTexture,
                    uri: imageURI,
                    animFrame: { key: `img_${this.count}`, frame: 0 },
                    isEnabled: true,
                    name: ""
                });

                this.rebuildAnimation();
                this.sprite?.setTexture(`img_${this.count}`, 0);
                this.count += 1;
                this.updateAnimationSelect();
            }
        }, { once: true });

        img.src = imageURI;
        return idx || this.count;
    }

    private handleZoom(event: Phaser.Input.Pointer)
    {
        if (!event.event.ctrlKey) return;

        if (event.deltaY > 0)
        {
            const currentZoom = this.game.scale.zoom;
            this.game.scale.setZoom(Phaser.Math.Clamp(currentZoom * 0.5, 1, 16));
        }
        else if (event.deltaY < 0)
        {
            const currentZoom = this.game.scale.zoom;
            this.game.scale.setZoom(Phaser.Math.Clamp(currentZoom * 2, 1, 16));
        }
    }

    private rebuildAnimation()
    {
        const frameRate = this.anim?.frameRate || 8;
        const yoyo = this.anim?.yoyo || false;

        if (this.anims.exists('anim'))
        {
            this.anims.remove('anim');
        }

        let framesToPlay: Phaser.Types.Animations.AnimationFrame[];

        if (this.selectedAnimationName) {
            framesToPlay = this.frames.filter(f => f.isEnabled && f.name === this.selectedAnimationName).map(f => f.animFrame);
        } else {
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
        
        this.sprite?.play('anim');
        this.playBtn.innerHTML = playButtonSVG;
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
        this.anim.frameRate = value;
        this.sprite?.anims.play('anim');
    }

    public offsetXY(id: number, x: number, y: number)
    {
        this.loadImage(this.frames[id].uri, x, y, id);
    }

    public updateAnimationSelect() {
        const animationNames = new Set<string>();
        this.frames.forEach(frame => {
            if (frame.name) { // Only add non-empty names
                animationNames.add(frame.name);
            }
        });

        // Store current selection before clearing
        const previousSelection = this.selectedAnimationName;

        // Clear existing options except the default "Select"
        while (this.selectAnimElement.options.length > 1) {
            this.selectAnimElement.remove(1);
        }

        const sortedNames = Array.from(animationNames).sort();
        let newSelection = null;

        sortedNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.selectAnimElement.appendChild(option);
            if (previousSelection === name) {
                newSelection = name; // Keep the previous selection if it still exists
            }
        });

        this.selectedAnimationName = newSelection;
        this.selectAnimElement.value = this.selectedAnimationName || ""; // Set the dropdown value

        this.rebuildAnimation();
    }

    private handleAnimationSelectChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        this.selectedAnimationName = target.value || null; // If value is empty string, set to null
        this.rebuildAnimation();
    }

    public saveAssets(idx: number)
    {
        if (idx >= this.frames.length) return;

        // Skip disabled frames
        if (!this.frames[idx].isEnabled) {
            this.saveAssets(idx + 1);
            return;
        }

        const name = (document.getElementById('name') as HTMLInputElement).value || 'img';
        const key = this.frames[idx].animFrame.key;
        let frameName = this.frames[idx].name || '';
        if (frameName)
        {
            frameName = frameName.padStart(frameName.length+1, '_');
        }
        this.sprite?.setTexture(key, 0);
        this.events.once(Phaser.Renderer.Events.RENDER, () =>
        {
            const texture = this.game.canvas.toDataURL('image/png');
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.onload = () =>
            {
                let a = document.createElement('a');
                a.href = window.URL.createObjectURL(xhr.response);
                a.download = `${name}${frameName}_${idx}`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
                if (idx < this.frames.length - 1)
                {
                    this.saveAssets(idx + 1);
                }
            };
            xhr.open('GET', texture);
            xhr.send();
        }, this);
    }

    public removeFrame(idx: number)
    {
        this.sprite.anims.stop();
        const playBtn = document.getElementById('play-anim') as HTMLButtonElement;
        playBtn.innerHTML = pauseButtonSVG;
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
