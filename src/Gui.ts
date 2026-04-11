import { TProjectData } from "./models/TProjectData";
import { deleteButtonSVG } from "./constant";

export class Gui {
    // DOM Elements - Left Panel
    public readonly imageCanvas = document.getElementById('imageCanvas') as HTMLCanvasElement;
    public readonly gridCanvas = document.getElementById('gridCanvas') as HTMLCanvasElement;
    public readonly imageElm = document.getElementById("image") as HTMLImageElement;
    public readonly redZone = document.getElementById("red-zone") as HTMLDivElement;
    public readonly leftPanel = document.getElementById('left-panel') as HTMLDivElement;

    // DOM Elements - Right Panel
    public readonly gridCanvasRight = document.getElementById('gridCanvasRight') as HTMLCanvasElement;
    public readonly floatingCanvas = document.getElementById('floating-canvas') as HTMLCanvasElement;
    public readonly frameList = document.getElementById('frame-list') as HTMLUListElement;
    public readonly playBtn = document.getElementById('play-anim') as HTMLButtonElement;
    public readonly selectAnim = document.getElementById('select-anim') as HTMLSelectElement;

    // DOM Elements - Inputs & Controls
    public readonly saveTilesetBtn = document.getElementById('save-tileset') as HTMLButtonElement;
    public readonly widthInput = document.getElementById('width') as HTMLInputElement;
    public readonly heightInput = document.getElementById('height') as HTMLInputElement;
    public readonly rangeElm = document.getElementById('range') as HTMLInputElement;
    public readonly gridSnapInput = document.getElementById('grid-snap') as HTMLInputElement;
    public readonly gridWidthInput = document.getElementById('grid-width') as HTMLInputElement;
    public readonly gridHeightInput = document.getElementById('grid-height') as HTMLInputElement;
    public readonly gridOffXInput = document.getElementById('grid-offx') as HTMLInputElement;
    public readonly gridOffYInput = document.getElementById('grid-offy') as HTMLInputElement;
    public readonly frameGridSizeInput = document.getElementById('frame-grid-size') as HTMLInputElement;
    public readonly yoyoInput = document.getElementById('yoyo') as HTMLInputElement;
    public readonly nameInput = document.getElementById('name') as HTMLInputElement;

    // Project & Modal Elements
    public readonly saveProjectBtn = document.getElementById('save-project') as HTMLButtonElement;
    public readonly openProjectBtn = document.getElementById('open-project') as HTMLButtonElement;
    public readonly projectListItems = document.getElementById('project-list-items');
    public readonly modalProjects = document.getElementById('modal-projects') as HTMLDialogElement;

    public readonly navbarHeight = document.querySelector('nav')?.clientHeight || 58;

    constructor() {}

    /**
     * Centralizes all event listener attachments for the main App.
     * Callbacks are provided by the controller (App).
     */
    public bindAppEvents(callbacks: {
        onOpenImage: (event: Event) => void,
        onAboutClick: (event: Event) => void,
        onWheel: (event: WheelEvent) => void,
        onKeyDown: (event: KeyboardEvent) => void,
        onImageMouseDown: (event: MouseEvent) => void,
        onImageMouseUp: (event: MouseEvent) => void,
        onImageContextMenu: (event: MouseEvent) => void,
        onLeftPanelMouseLeave: (event: MouseEvent) => void,
        onSaveTilesetClick: () => void,
        onCanvasSizeChange: () => void,
        onPlayPauseClick: () => void,
        onFrameRateChange: (event: Event) => void,
        onYoyoChange: (event: Event) => void,
        onGridStateChange: () => void,
        onRightGridSizeInput: () => void,
        onSaveProjectClick?: () => void, // Handled by ProjectManager
        onOpenProjectClick?: (event: Event) => void, // Handled by ProjectManager
        onSelectAnimChange?: (event: Event) => void // Handled by App
    }) {
        document.getElementById('open-image')?.addEventListener('change', callbacks.onOpenImage);
        document.getElementById('about-btn')?.addEventListener('click', callbacks.onAboutClick);
        document.addEventListener('wheel', callbacks.onWheel, { passive: false });
        document.addEventListener('keydown', callbacks.onKeyDown);

        document.querySelectorAll('[id ^= "close-"]').forEach(elm => 
            elm.addEventListener('click', (e) => this.closeModal(e))
        );

        this.imageCanvas.addEventListener('mousedown', callbacks.onImageMouseDown);
        this.imageCanvas.addEventListener('mouseup', callbacks.onImageMouseUp);
        this.imageCanvas.addEventListener('contextmenu', callbacks.onImageContextMenu);
        this.leftPanel.addEventListener('mouseleave', callbacks.onLeftPanelMouseLeave);
        
        this.saveTilesetBtn.addEventListener('click', callbacks.onSaveTilesetClick);
        this.widthInput.addEventListener('change', callbacks.onCanvasSizeChange);
        this.heightInput.addEventListener('change', callbacks.onCanvasSizeChange);
        this.playBtn.addEventListener('click', callbacks.onPlayPauseClick);
        this.rangeElm.addEventListener('change', callbacks.onFrameRateChange);
        this.yoyoInput?.addEventListener('change', callbacks.onYoyoChange);

        this.gridSnapInput.addEventListener('change', callbacks.onGridStateChange);
        this.gridWidthInput.addEventListener('input', callbacks.onGridStateChange);
        this.gridHeightInput.addEventListener('input', callbacks.onGridStateChange);
        this.gridOffXInput.addEventListener('input', callbacks.onGridStateChange);
        this.gridOffYInput.addEventListener('input', callbacks.onGridStateChange);
        this.frameGridSizeInput.addEventListener('input', callbacks.onRightGridSizeInput);

        if (callbacks.onSelectAnimChange) {
            this.selectAnim.addEventListener('change', callbacks.onSelectAnimChange);
        }

        if (callbacks.onSaveProjectClick) {
            this.saveProjectBtn?.addEventListener('click', callbacks.onSaveProjectClick);
        }
        if (callbacks.onOpenProjectClick) {
            this.openProjectBtn?.addEventListener('click', callbacks.onOpenProjectClick);
        }
    }

    public openModal(id: string) {
        const modal = document.getElementById(id) as HTMLDialogElement;
        if (modal) {
            modal.open = true;
        }
    }

    public closeModal(event: Event) {
        event.preventDefault();
        const targetId = (event.currentTarget as HTMLElement).getAttribute("data-target");
        if (targetId) {
            const modal = document.getElementById(targetId) as HTMLDialogElement;
            if (modal) modal.open = false;
        }
    }

    public setRedZonePosition(x: number, y: number) {
        this.redZone.style.left = `${x}px`;
        this.redZone.style.top = `${y}px`;
    }

    public setRedZoneSize(w: number, h: number) {
        this.redZone.style.width = `${w}px`;
        this.redZone.style.height = `${h}px`;
    }

    /**
     * Updates all UI setting fields from a project data object.
     */
    public applyProjectSettings(settings: TProjectData['settings']) {
        this.widthInput.value = settings.canvasWidth;
        this.heightInput.value = settings.canvasHeight;
        this.frameGridSizeInput.value = settings.frameGridSize || "8";
        this.rangeElm.value = settings.frameRate;
        
        if (this.yoyoInput) {
            this.yoyoInput.checked = settings.yoyo;
        }

        // Grid UI sync
        this.gridSnapInput.checked = settings.grid.isEnabled;
        this.gridWidthInput.value = settings.grid.width.toString();
        this.gridHeightInput.value = settings.grid.height.toString();
        this.gridOffXInput.value = settings.grid.offsetX.toString();
        this.gridOffYInput.value = settings.grid.offsetY.toString();
    }

    /**
     * Returns the current settings from the UI fields.
     */
    public getProjectSettings() {
        return {
            canvasWidth: this.widthInput.value,
            canvasHeight: this.heightInput.value,
            frameGridSize: this.frameGridSizeInput.value,
            frameRate: this.rangeElm.value,
            yoyo: this.yoyoInput?.checked || false
        };
    }

    /**
     * Renders the list of projects in the modal.
     */
    public renderProjectList(
        projectNames: string[], 
        onSelect: (name: string) => void, 
        onDelete: (name: string, event: Event) => void,
        deleteIcon: string
    ) {
        if (!this.projectListItems) return;
        this.projectListItems.innerHTML = '';

        if (projectNames.length === 0) {
            this.projectListItems.innerHTML = '<li>No saved project.</li>';
            return;
        }

        projectNames.forEach(name => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.textContent = name;
            btn.classList.add('outline', 'secondary', 'flex-space-between');
            btn.style.width = '100%';
            btn.style.minWidth = '300px';
            btn.style.textAlign = 'left';
            btn.style.marginBottom = '10px';
            
            btn.addEventListener('click', () => onSelect(name));

            const deleteBtn = document.createElement('button');
            deleteBtn.title = `Delete project`;
            deleteBtn.role = "button";
            deleteBtn.classList.add('right');
            deleteBtn.innerHTML = deleteIcon;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onDelete(name, e);
            });

            btn.appendChild(deleteBtn);
            li.appendChild(btn);
            this.projectListItems?.appendChild(li);
        });
    }

    /**
     * Creates the DOM structure for a frame list item.
     */
    public createFrameItem(id: number, callbacks: {
        onOffsetChange: () => void,
        onNameInput: (val: string) => void,
        onToggle: () => void,
        onMoveUp: (e: MouseEvent) => void,
        onMoveDown: (e: MouseEvent) => void,
        onDelete: () => void,
        onSelect: (e: MouseEvent) => void
    }) {
        const li = document.createElement('li');
        li.id = id.toString();
        li.classList.add('frame-list');
        li.textContent = `${id}-   `;
        li.addEventListener('click', callbacks.onSelect);

        const offsetXInput = this.createInternalInput('number', ['input-number', 'text-light'], `offsetX_${id}`, '0', callbacks.onOffsetChange);
        const offsetYInput = this.createInternalInput('number', ['input-number', 'text-light'], `offsetY_${id}`, '0', callbacks.onOffsetChange);
        const nameInput = this.createInternalInput('text', ['input-name', 'text-light'], `name_${id}`, '', (e) => callbacks.onNameInput((e.target as HTMLInputElement).value));

        const enabledInput = document.createElement('input');
        enabledInput.type = 'checkbox';
        enabledInput.checked = true;
        enabledInput.title = 'Activer/Désactiver dans l\'animation';
        enabledInput.addEventListener('change', callbacks.onToggle);

        const upBtn = this.createInternalButton('↑', 'Up', callbacks.onMoveUp);
        const downBtn = this.createInternalButton('↓', 'Down', callbacks.onMoveDown);
        const deleteBtn = this.createInternalButton(deleteButtonSVG, 'Delete frame', callbacks.onDelete, ['right']);

        // Assembly
        const spanEnabled = document.createElement('span');
        spanEnabled.appendChild(enabledInput);
        
        const spanUpDownButtons = document.createElement('span');
        spanUpDownButtons.role = "group";
        spanUpDownButtons.append(upBtn, downBtn);

        const spanX = document.createElement('span');
        spanX.append(this.createInternalLabel('X: ', 'frame offset x', ['inline-label', 'text-light']), offsetXInput);

        const spanY = document.createElement('span');
        spanY.append(this.createInternalLabel('Y: ', 'frame offset y', ['inline-label', 'text-light']), offsetYInput);

        const spanName = document.createElement('span');
        spanName.append(this.createInternalLabel('Anim: ', 'animation name', ['inline-label', 'text-light']), nameInput);

        li.append(spanEnabled, spanUpDownButtons, spanName, spanX, spanY, deleteBtn);
        this.frameList.appendChild(li);

        return { offsetXInput, offsetYInput, nameInput, enabledInput };
    }

    private createInternalInput(type: string, classes: string[], id: string, value: string, onInput: (e: Event) => void) {
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.value = value;
        classes.forEach(c => input.classList.add(c));
        input.addEventListener('input', onInput);
        return input;
    }

    private createInternalLabel(text: string, title: string, classes: string[]) {
        const label = document.createElement('label');
        label.textContent = text;
        label.title = title;
        classes.forEach(c => label.classList.add(c));
        return label;
    }

    private createInternalButton(html: string, title: string, onClick: (e: MouseEvent) => void, classes: string[] = []) {
        const btn = document.createElement('button');
        btn.innerHTML = html;
        btn.title = title;
        btn.role = "button";
        classes.forEach(c => btn.classList.add(c));
        btn.addEventListener('click', onClick);
        return btn;
    }

    public swapFrameUI(idxA: number, idxB: number) {
        const liA = document.getElementById(idxA.toString());
        const liB = document.getElementById(idxB.toString());
        if (!liA || !liB) return;

        // Swap IDs and Text
        liA.id = idxB.toString();
        liB.id = idxA.toString();
        liA.childNodes[0].textContent = `${idxB}-   `;
        liB.childNodes[0].textContent = `${idxA}-   `;

        // Reorder in DOM
        if (idxA < idxB) {
            this.frameList.insertBefore(liB, liA);
        } else {
            this.frameList.insertBefore(liA, liB);
        }
    }

    /**
     * Corrects the visual indices and IDs of all items after a deletion.
     */
    public reindexFrameUI(deletedId: number) {
        const list = this.frameList.children;
        for (let i = 0; i < list.length; i++) {
            const li = list.item(i) as HTMLElement;
            const currentId = parseInt(li.id);
            if (currentId > deletedId) {
                const newId = currentId - 1;
                li.id = newId.toString();
                li.childNodes[0].textContent = `${newId}-   `;
            }
        }
    }

    public removeFrameItem(id: number) {
        const li = document.getElementById(id.toString());
        li?.remove();
    }
}