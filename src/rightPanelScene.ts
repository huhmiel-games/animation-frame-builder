import Phaser from "phaser";
import { pauseButtonSVG, playButtonSVG } from "./constant";

export class RightPanelScene extends Phaser.Scene
{
    images: Phaser.Textures.CanvasTexture[] = [];
    imagesUri: string[] = [];
    sprite: Phaser.GameObjects.Sprite | null = null;
    anim: Phaser.Animations.Animation;
    animFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    count: number = 0;
    enabledFrames: boolean[] = [];
    playBtn: HTMLButtonElement;

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
    }

    public preload()
    {
        const anim = this.anims.create({
            key: 'anim',
            frames: this.animFrames,
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

                this.images[idx] = (canvasTexture);
                this.animFrames[idx] = { key: `img_${idx}`, frame: 0 };
                this.anim.removeFrameAt(idx);
                const modifiedFrame = this.animFrames.at(idx);
                if (!modifiedFrame) throw new Error("Texture modification failed");
                this.sprite.setTexture(`img_${idx}`, 0);
                this.anim.addFrameAt(idx, [modifiedFrame]);
            }
            else
            {
                const canvasTexture = this.textures.createCanvas(`img_${this.count}`, this.scale.width, this.scale.height);
                if (!canvasTexture) throw new Error("Canvas texture failed");

                const ctx = canvasTexture.getContext();
                ctx.drawImage(img, offsetX, offsetY);
                canvasTexture.refresh();

                this.images.push(canvasTexture);
                this.animFrames.push({ key: `img_${this.count}`, frame: 0 });
                const newFrame = this.animFrames.at(-1);
                if (!newFrame) throw new Error("Texture creation failed");
                this.enabledFrames.push(true);
                this.rebuildAnimation();
                this.sprite.setTexture(`img_${this.count}`, 0);
                this.count += 1;
                this.imagesUri.push(imageURI);
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

        const framesToPlay = this.animFrames.filter((_, i) => this.enabledFrames[i]);
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
        this.enabledFrames[idx] = enabled;
        this.rebuildAnimation();
    }

    public moveFrame(idx: number, direction: 'up' | 'down')
    {
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= this.animFrames.length) return;

        // Swap data in arrays
        [this.images[idx], this.images[targetIdx]] = [this.images[targetIdx], this.images[idx]];
        [this.imagesUri[idx], this.imagesUri[targetIdx]] = [this.imagesUri[targetIdx], this.imagesUri[idx]];
        [this.enabledFrames[idx], this.enabledFrames[targetIdx]] = [this.enabledFrames[targetIdx], this.enabledFrames[idx]];

        this.updateTextureKeys();
        this.rebuildAnimation();
    }

    private updateTextureKeys()
    {
        const tempPrefix = `reorder_${Date.now()}_`;
        this.images.forEach((tex) =>
        {
            this.textures.renameTexture(tex.key, tempPrefix + tex.key);
        });

        this.images.forEach((tex, i) =>
        {
            this.textures.renameTexture(tex.key, `img_${i}`);
            this.animFrames[i] = { key: `img_${i}`, frame: 0 };
        });
    }

    public changeFrameRate(value: number)
    {
        this.anim.frameRate = value;
        this.sprite?.anims.play('anim');
    }

    public offsetXY(id: number, x: number, y: number)
    {
        this.loadImage(this.imagesUri[id], x, y, id);
    }

    public saveAssets(idx: number)
    {
        const name = (document.getElementById('name') as HTMLInputElement).value || 'img';
        const key = this.animFrames[idx].key;
        this.sprite.setTexture(key, 0);
        this.events.once(Phaser.Renderer.Events.RENDER, () =>
        {
            const texture = this.game.canvas.toDataURL('image/png');
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.onload = () =>
            {
                let a = document.createElement('a');
                a.href = window.URL.createObjectURL(xhr.response);
                a.download = `${name}_${idx}`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
                if (idx < this.animFrames.length - 1)
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
        playBtn.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6.906 4.537A.6.6 0 006 5.053v13.894a.6.6 0 00.906.516l11.723-6.947a.6.6 0 000-1.032L6.906 4.537z" stroke="#eeeeee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        this.anim.removeFrameAt(idx);
        this.textures.removeKey(`img_${idx}`);
        this.images.splice(idx, 1);
        this.imagesUri.splice(idx, 1);
        this.animFrames.splice(idx, 1);
        this.enabledFrames.splice(idx, 1);
        this.count -= 1;

        this.updateTextureKeys();
        this.rebuildAnimation();

        if (this.animFrames.length === 0)
        {
            this.sprite.setTexture('_DEFAULT');
        }
    }
}
