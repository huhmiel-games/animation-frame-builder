import { RightPanelScene } from "./rightPanelScene";
import { framesInstance } from "./script";

export class FrameListElement
{
    id: number
    dataUri: string
    scene: RightPanelScene
    offsetXInput: HTMLInputElement;
    offsetYInput: HTMLInputElement;

    constructor(id: number, dataUri: string, scene: RightPanelScene)
    {
        this.id = id;
        this.dataUri = dataUri;
        this.scene = scene;
        this.handleChange = this.handleChange.bind(this);
        this.deleteFrame = this.deleteFrame.bind(this);
        this.selectFrame = this.selectFrame.bind(this);
        this.render();
    }

    render()
    {
        const ul = document.getElementById('frame-list') as HTMLUListElement;
        const li = document.createElement('li')
        li.id = this.id.toString();
        li.classList.add('frame-list')

        const offsetXLabel = this.createLabel('frame offset x in pixels', 'OffsetX: ', ['inline-label', 'text-light'], 'offset-x');
        const offsetYLabel = this.createLabel('frame offset y in pixels', 'OffsetY: ', ['inline-label', 'text-light'], 'offset-y');
        this.offsetXInput = this.createInputNumber(`offsetX_${this.id}`, ['frame-offset', 'text-light']);
        this.offsetYInput = this.createInputNumber(`offsetY_${this.id}`, ['frame-offset', 'text-light']);
        const deleteBtn = document.createElement('button');
        deleteBtn.title = `Delete frame`;
        deleteBtn.role = "button";
        deleteBtn.classList.add('right');
        deleteBtn.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M20 9l-1.995 11.346A2 2 0 0116.035 22h-8.07a2 2 0 01-1.97-1.654L4 9M21 6h-5.625M3 6h5.625m0 0V4a2 2 0 012-2h2.75a2 2 0 012 2v2m-6.75 0h6.75" stroke="#eeeeee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        deleteBtn.addEventListener('click', this.deleteFrame)
        const spanX = document.createElement('span');
        const spanY = document.createElement('span');
        spanX.appendChild(offsetXLabel);
        spanX.appendChild(this.offsetXInput);
        spanY.appendChild(offsetYLabel);
        spanY.appendChild(this.offsetYInput);
        li.textContent = `${this.id}-   `
        li.appendChild(spanX);
        li.appendChild(spanY);
        li.appendChild(deleteBtn);
        li.addEventListener('click', this.selectFrame)
        ul.appendChild(li);
    }

    private createLabel(title: string, txt: string, classList: string[], htmlFor: string): HTMLLabelElement
    {
        const label = document.createElement('label');
        classList.forEach(str => label.classList.add(str));
        label.htmlFor = htmlFor;
        label.title = title;
        label.textContent = txt;
        return label;
    }

    private createInputNumber(id: string, classList: string[]): HTMLInputElement
    {
        const inputNumber = document.createElement('input');
        inputNumber.type = 'number';
        classList.forEach(str => inputNumber.classList.add(str));
        inputNumber.id = id;
        inputNumber.value = '0';
        inputNumber.addEventListener('change', this.handleChange)
        return inputNumber;
    }

    private handleChange(event)
    {
        // const id = event.target.id.split('_')[1];
        const x = +this.offsetXInput.value;
        const y = +this.offsetYInput.value;
        this.scene.offsetXY(this.id, x, y);
    }

    private selectFrame(event)
    {
        if (event.target.nodeName === 'LI')
        {
            this.unselectFrames()
            event.target.classList.add('border')
            this.scene.sprite.anims.stop();
            this.scene.sprite.setTexture(`img_${this.id}`);
            const playBtn = document.getElementById('play-anim') as HTMLButtonElement;
            playBtn.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6.906 4.537A.6.6 0 006 5.053v13.894a.6.6 0 00.906.516l11.723-6.947a.6.6 0 000-1.032L6.906 4.537z" stroke="#eeeeee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
        }
    }

    private unselectFrames()
    {
        const children = document.getElementById('frame-list')?.childNodes;
        children.forEach(elm => (elm as HTMLLIElement).classList.remove('border'));
    }

    private deleteFrame()
    {
        this.scene.removeFrame(this.id);
        this.destroy();
        const list = document.getElementById('frame-list').children;
        const length = list.length;
        framesInstance.splice(this.id, 1);
        framesInstance.forEach(frame =>
        {
            if (frame.id > this.id)
            {
                frame.id -= 1
            }
        })
        for (let i = 0; i < length; i += 1)
        {
            const li = list.item(i)
            if (+li.id > this.id)
            {
                li.id = `${+li.id - 1}`
            }
        }
    }

    private destroy()
    {
        const li = document.getElementById(this.id.toString());
        li.removeEventListener('click', this.deleteFrame);
        li.remove();
    }
}
