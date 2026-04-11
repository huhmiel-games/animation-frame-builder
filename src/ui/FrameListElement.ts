import { RightPanelScene } from "../scenes/RightPanelScene";
import { App } from "../App";

export class FrameListElement
{
    id: number;
    dataUri: string;
    scene: RightPanelScene;
    offsetXInput: HTMLInputElement;
    offsetYInput: HTMLInputElement;
    enabledInput: HTMLInputElement;
    nameInput: HTMLInputElement;
    framesInstance: FrameListElement[];
    private app: App;

    constructor(id: number, dataUri: string, scene: RightPanelScene, app: App, framesInstance: FrameListElement[])
    {
        this.id = id;
        this.dataUri = dataUri;
        this.scene = scene;
        this.app = app;
        this.framesInstance = framesInstance;
        this.handleChange = this.handleChange.bind(this);
        this.deleteFrame = this.deleteFrame.bind(this);
        this.selectFrame = this.selectFrame.bind(this);
        this.toggleEnable = this.toggleEnable.bind(this);
        this.moveUp = this.moveUp.bind(this);
        this.moveDown = this.moveDown.bind(this);

        // UI Delegation to Gui service
        const elements = this.app.gui.createFrameItem(id, {
            onOffsetChange: this.handleChange,
            onNameInput: (val) => {
                this.scene.frames[this.id].name = val;
                this.scene.updateAnimationSelect();
            },
            onToggle: this.toggleEnable,
            onMoveUp: this.moveUp,
            onMoveDown: this.moveDown,
            onDelete: this.deleteFrame,
            onSelect: this.selectFrame
        });

        this.offsetXInput = elements.offsetXInput;
        this.offsetYInput = elements.offsetYInput;
        this.nameInput = elements.nameInput;
        this.enabledInput = elements.enabledInput;
    }

    public updateUIFromData(offsetX: number, offsetY: number, name: string, isEnabled: boolean)
    {
        this.offsetXInput.value = offsetX.toString();
        this.offsetYInput.value = offsetY.toString();
        this.nameInput.value = name;
        this.enabledInput.checked = isEnabled;
    }

    private handleChange()
    {
        // const id = event.target.id.split('_')[1];
        const x = +this.offsetXInput.value;
        const y = +this.offsetYInput.value;
        this.scene.offsetXY(this.id, x, y);
    }

    private toggleEnable()
    {
        this.scene.toggleFrame(this.id, this.enabledInput.checked);
    }

    private moveUp(event: MouseEvent)
    {
        event.stopPropagation();
        if (this.id === 0) return;
        this.scene.moveFrame(this.id, 'up');
        this.swapUI(this.id, this.id - 1);
    }

    private moveDown(event: MouseEvent)
    {
        event.stopPropagation();

        if (this.id >= this.framesInstance.length - 1) return;

        this.scene.moveFrame(this.id, 'down');
        this.swapUI(this.id, this.id + 1);
    }

    private swapUI(idxA: number, idxB: number)
    {
        this.app.gui.swapFrameUI(idxA, idxB);
        // Swap in array
        [this.framesInstance[idxA], this.framesInstance[idxB]] = [this.framesInstance[idxB], this.framesInstance[idxA]];
        // Update internal IDs
        this.framesInstance[idxA].id = idxA;
        this.framesInstance[idxB].id = idxB;
    }

    private selectFrame(event: MouseEvent)
    {
        const target = event.target as HTMLElement;
        // Selection happens if we click the LI or its non-interactive children (span, label)
        if (['LI', 'SPAN', 'LABEL'].includes(target.nodeName))
        {
            this.unselectFrames();
            const li = event.currentTarget as HTMLLIElement;
            li.classList.add('border');
            this.scene.sprite.anims.stop();
            this.scene.sprite.setTexture(`img_${this.id}`);
            this.scene.stopAnimation(); // Emit event to update playBtn
        }
    }

    private unselectFrames()
    {
        const children = this.app.gui.frameList?.childNodes;
        children.forEach(elm => (elm as HTMLLIElement).classList.remove('border'));
    }

    private deleteFrame()
    {
        this.scene.removeFrame(this.id);
        const deletedId = this.id;

        this.app.gui.removeFrameItem(deletedId);
        this.app.gui.reindexFrameUI(deletedId);

        this.framesInstance.splice(this.id, 1);
        this.framesInstance.forEach(frame =>
        {
            if (frame.id > this.id)
            {
                frame.id -= 1;
            }
        });
    }
}
