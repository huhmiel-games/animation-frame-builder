import { deleteButtonSVG } from "./constant";
import { RightPanelScene } from "./rightPanelScene";
//import { framesInstance } from "./script";

export class FrameListElement
{
    id: number
    dataUri: string
    scene: RightPanelScene
    offsetXInput: HTMLInputElement;
    offsetYInput: HTMLInputElement;
    enabledInput: HTMLInputElement;
    nameInput: HTMLInputElement;
    framesInstance: FrameListElement[];

    constructor(id: number, dataUri: string, scene: RightPanelScene, framesInstance: FrameListElement[])
    {
        this.id = id;
        this.dataUri = dataUri;
        this.scene = scene;
        this.framesInstance = framesInstance;
        this.handleChange = this.handleChange.bind(this);
        this.deleteFrame = this.deleteFrame.bind(this);
        this.selectFrame = this.selectFrame.bind(this);
        this.toggleEnable = this.toggleEnable.bind(this);
        this.moveUp = this.moveUp.bind(this);
        this.moveDown = this.moveDown.bind(this);
        this.render();
    }

    render()
    {
        const ul = document.getElementById('frame-list') as HTMLUListElement;
        const li = document.createElement('li')
        li.id = this.id.toString();
        li.classList.add('frame-list')

        const offsetXLabel = this.createLabel('frame offset x in pixels', 'X: ', ['inline-label', 'text-light'], 'offset-x');
        const offsetYLabel = this.createLabel('frame offset y in pixels', 'Y: ', ['inline-label', 'text-light'], 'offset-y');
        this.offsetXInput = this.createInputNumber(`offsetX_${this.id}`, ['input-number', 'text-light'], 'offset-x');
        this.offsetYInput = this.createInputNumber(`offsetY_${this.id}`, ['input-number', 'text-light'], 'offset-y');

        const nameLabel = this.createLabel('animation name', 'Anim: ', ['inline-label', 'text-light'], 'frame-name');
        this.nameInput = this.createInputText(`name_${this.id}`, ['input-name', 'text-light'], 'frame-name');

        this.enabledInput = document.createElement('input');
        this.enabledInput.type = 'checkbox';
        this.enabledInput.checked = true;
        this.enabledInput.title = 'Activer/Désactiver dans l\'animation';
        this.enabledInput.addEventListener('change', this.toggleEnable);

        const upBtn = document.createElement('button');
        upBtn.innerHTML = '↑';
        upBtn.title = 'Up';
        upBtn.role = "button";
        upBtn.addEventListener('click', this.moveUp);

        const downBtn = document.createElement('button');
        downBtn.innerHTML = '↓';
        downBtn.title = 'Down';
        downBtn.role = "button";
        downBtn.addEventListener('click', this.moveDown);

        const deleteBtn = document.createElement('button');
        deleteBtn.title = `Delete frame`;
        deleteBtn.role = "button";
        deleteBtn.classList.add('right');
        deleteBtn.innerHTML = deleteButtonSVG;
        deleteBtn.addEventListener('click', this.deleteFrame)

        const spanEnabled = document.createElement('span');
        spanEnabled.appendChild(this.enabledInput);
        const spanUpDownButtons = document.createElement('span');
        spanUpDownButtons.role="group";
        spanUpDownButtons.appendChild(upBtn);
        spanUpDownButtons.appendChild(downBtn);

        const spanX = document.createElement('span');
        const spanY = document.createElement('span');
        const spanName = document.createElement('span');
        spanX.appendChild(offsetXLabel);
        spanX.appendChild(this.offsetXInput);
        spanY.appendChild(offsetYLabel);
        spanY.appendChild(this.offsetYInput);
        spanName.appendChild(nameLabel);
        spanName.appendChild(this.nameInput);
        li.textContent = `${this.id}-   `
        li.appendChild(spanEnabled);
        li.appendChild(spanUpDownButtons);
        li.appendChild(spanName);
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

    private createInputNumber(id: string, classList: string[], name: string): HTMLInputElement
    {
        const inputNumber = document.createElement('input');
        inputNumber.type = 'number';
        classList.forEach(str => inputNumber.classList.add(str));
        inputNumber.id = name + "_" + this.id; // Correct ID for label association
        inputNumber.value = '0';
        inputNumber.addEventListener('input', this.handleChange)
        return inputNumber;
    }

    private createInputText(id: string, classList: string[], name: string): HTMLInputElement
    {
        const inputText = document.createElement('input');
        inputText.type = 'text';
        classList.forEach(str => inputText.classList.add(str));
        inputText.id = name + "_" + this.id;
        inputText.value = '';
        inputText.addEventListener('input', () => {
            this.scene.frameNames[this.id] = inputText.value;
        });
        return inputText;
    }

    private handleChange(event)
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
        const ul = document.getElementById('frame-list') as HTMLUListElement;
        const liA = document.getElementById(idxA.toString());
        const liB = document.getElementById(idxB.toString());

        if (liA && liB)
        {
            // Swap IDs in DOM
            liA.id = idxB.toString();
            liB.id = idxA.toString();
            
            // Update text content
            liA.childNodes[0].textContent = `${idxB}-   `;
            liB.childNodes[0].textContent = `${idxA}-   `;

            // Swap in array
            [this.framesInstance[idxA], this.framesInstance[idxB]] = [this.framesInstance[idxB], this.framesInstance[idxA]];
            // Update internal IDs
            this.framesInstance[idxA].id = idxA;
            this.framesInstance[idxB].id = idxB;

            // Reorder in DOM
            if (idxA < idxB) ul.insertBefore(liB, liA);
            else ul.insertBefore(liA, liB);
        }
    }

    private selectFrame(event)
    {
        // Selection happens if we click the LI or its non-interactive children (span, label)
        if (['LI', 'SPAN', 'LABEL'].includes(event.target.nodeName))
        {
            this.unselectFrames()
            const li = event.currentTarget as HTMLLIElement;
            li.classList.add('border')
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
        this.framesInstance.splice(this.id, 1);
        this.framesInstance.forEach(frame =>
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
