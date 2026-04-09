import Phaser from 'phaser';
import { RightPanelScene } from "./rightPanelScene";
import { TImage, TSelectedImageArea, TTileset } from "./types";
import { FrameListElement } from './FrameListElement';

// Html elements
const saveTilesetBtn = document.getElementById('save-tileset') as HTMLButtonElement;
const imageElm = document.getElementById("image") as HTMLImageElement;
const widthInput = document.getElementById('width') as HTMLInputElement;
const heightInput = document.getElementById('height') as HTMLInputElement;
const imageCanvas = document.getElementById('imageCanvas') as HTMLCanvasElement;
const redZone = document.getElementById("red-zone") as HTMLDivElement;
const floatingCanvas = document.getElementById('floating-canvas') as HTMLCanvasElement;
const leftPanel = document.getElementById('left-panel') as HTMLDivElement;
const playBtn = document.getElementById('play-anim') as HTMLButtonElement;
const rangeElm = document.getElementById('range') as HTMLInputElement;

// Data
const selectedImageArea: TSelectedImageArea = {
    sx: 0,
    sy: 0,
    ex: 0,
    ey: 0,
    isDirty: false,
    isComplete: false,
    data: undefined
}

const image: TImage = {
    name: '',
    width: 0,
    height: 0,
    isLoaded: false,
    zoom: 1,
    offsetX: 0,
    offsetY: 0
}

const tileset: TTileset = {
    name: '',
    width: 0,
    height: 0,
    isLoaded: false,
    zoom: 1,
    undos: [],
    redos: []
}

const config: Phaser.Types.Core.GameConfig = {
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
    physics: {
        default: 'arcade',
        arcade: {
            tileBias: 20,
            gravity: { x: 0, y: 0 },
            debug: true,
            debugShowBody: true,
            debugShowStaticBody: true,
        },
    },
    scene: [RightPanelScene],
}

let game: Phaser.Game = new Phaser.Game(config);

let visibleModal: HTMLElement | null = null;
const navbarHeight = document.querySelector('nav')?.clientHeight || 58;
export const framesInstance: FrameListElement[] = []

// Event listeners
document.getElementById('open-image')?.addEventListener('change', openImage, false);
document.getElementById('about-btn')?.addEventListener('click', openModal, false);
document.addEventListener('wheel', onMouseWheel, { passive: false });
(document.querySelectorAll('[id ^= "close-"]')).forEach(elm => elm.addEventListener('click', closeModal));
document.addEventListener('keydown', handleKeyPress);
imageCanvas.addEventListener('mousedown', onImageCanvasMouseDown, false);
imageCanvas.addEventListener('mouseup', onImageCanvasMouseUp, false);
imageCanvas.addEventListener('contextmenu', resetSelection, false);
saveTilesetBtn.addEventListener('click', downloadTilesetAsImage, false);
widthInput.addEventListener('change', startPhaser, false);
heightInput.addEventListener('change', startPhaser, false);
playBtn.addEventListener('click', playOrPause);
rangeElm.addEventListener('change', changeFrameRate)
document.getElementById('yoyo')?.addEventListener('change', setYoyo);
// Init

function startPhaser()
{
    if (+widthInput.value !== 0 && +heightInput.value !== 0)
    {
        config.width = +widthInput.value;
        config.height = +heightInput.value;
        game.scale.resize(config.width, config.height);
        const scene = game.scene.getScene('RightPanelScene') as RightPanelScene;
        scene.cameras.main.setViewport(0, 0, config.width, config.height)
        scene.sprite?.setPosition(config.width / 2, config.height / 2)
    }
}

function setYoyo(event)
{
    const scene = game.scene.getScene('RightPanelScene') as RightPanelScene;
    const anim = scene.anim;
    if (!anim) return;
    anim.yoyo = event.target.checked;
    scene.sprite?.anims.stop();
    scene.sprite?.anims.play('anim');
}

function playOrPause()
{
    const scene = game.scene.getScene('RightPanelScene') as RightPanelScene;
    const sprite = scene.sprite;
    if (!sprite) return;
    if (sprite.anims.isPlaying)
    {
        sprite.anims.stop();
        playBtn.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6.906 4.537A.6.6 0 006 5.053v13.894a.6.6 0 00.906.516l11.723-6.947a.6.6 0 000-1.032L6.906 4.537z" stroke="#eeeeee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
        return;
    }

    // if (!sprite.anims.isPaused)
    // {
    //     sprite.anims.resume();
    //     playBtn.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6 18.4V5.6a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6v12.8a.6.6 0 01-.6.6H6.6a.6.6 0 01-.6-.6zM14 18.4V5.6a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6v12.8a.6.6 0 01-.6.6h-2.8a.6.6 0 01-.6-.6z" stroke="#eeeeee" stroke-width="1.5"></path></svg>'
    //     return;
    // }

    if(!sprite.anims.isPlaying){
        sprite.anims.play('anim');
        playBtn.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6 18.4V5.6a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6v12.8a.6.6 0 01-.6.6H6.6a.6.6 0 01-.6-.6zM14 18.4V5.6a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6v12.8a.6.6 0 01-.6.6h-2.8a.6.6 0 01-.6-.6z" stroke="#eeeeee" stroke-width="1.5"></path></svg>'
        return;
    }
}

function changeFrameRate(event)
{
    const scene = game.scene.getScene('RightPanelScene') as RightPanelScene;
    scene.changeFrameRate(+event.target.value)
}

// Settings
function openModal(event)
{
    event.preventDefault();
    const modal = document.getElementById(event.currentTarget.getAttribute("data-target")) as HTMLDialogElement;
    modal.open = true;
    visibleModal = modal;
}

function closeModal(event)
{
    visibleModal = null;
    event.preventDefault();
    const modal = document.getElementById(event.currentTarget.getAttribute("data-target")) as HTMLDialogElement;
    modal.open = false;
}

// Image canvas
function openImage(event)
{
    const imageFiles = event.target.files;
    const imageFilesLength = imageFiles.length;
    if (imageFilesLength > 0)
    {
        image.name = imageFiles.name;
        const imageSrc = URL.createObjectURL(imageFiles[0]);
        imageElm.src = imageSrc;
        imageElm.addEventListener("load", (e) =>
        {
            image.width = imageElm.naturalWidth;
            image.height = imageElm.naturalHeight;
            imageCanvas.classList.remove('none');
            drawImage(imageCanvas, imageElm);
            image.isLoaded = true;
        }, { once: true });
    }
}

async function copy()
{
    const imageCtx = imageCanvas.getContext('2d');
    if (!imageCtx) return;
    try
    {
        selectedImageArea.data = imageCtx.getImageData(
            selectedImageArea.sx / image.zoom,
            selectedImageArea.sy / image.zoom,
            (selectedImageArea.ex - selectedImageArea.sx) / image.zoom,
            (selectedImageArea.ey - selectedImageArea.sy) / image.zoom
        );
    } catch (error)
    {
        alert('Select a zone first');
        return;
    }

    floatingCanvas.width = +widthInput.value;
    floatingCanvas.height = +heightInput.value;

    const posX = floatingCanvas.width / 2 - selectedImageArea.data.width / 2;
    const posY = floatingCanvas.height / 2 - selectedImageArea.data.height / 2;

    const ctx = floatingCanvas.getContext('2d');
    ctx?.putImageData(selectedImageArea.data, posX, posY);
    const copiedImage = floatingCanvas.toDataURL();
    const scene = game.scene.getScene('RightPanelScene') as RightPanelScene;
    const id = await scene.loadImage(copiedImage);
    const newFrame = new FrameListElement(id, copiedImage, scene);
    framesInstance.push(newFrame);
}

function onImageCanvasMouseDown(event: MouseEvent)
{
    if (image.isLoaded === false || event.button !== 0) return;

    if (selectedImageArea.isComplete)
    {
        resetSelection(event);
    }

    selectedImageArea.sx = roundMultipleOf8((event.offsetX - image.offsetX) * image.zoom) / image.zoom
    selectedImageArea.sy = roundMultipleOf8((event.offsetY - image.offsetY) * image.zoom) / image.zoom
    selectedImageArea.isDirty = true;

    placeRedZone(selectedImageArea.sx, selectedImageArea.sy);
}

function onImageCanvasMouseUp(event: MouseEvent)
{
    if (
        selectedImageArea.isDirty === false ||
        image.isLoaded === false ||
        selectedImageArea.isComplete === true ||
        event.button !== 0
    ) return;

    let width = roundMultipleOf8(event.offsetX - selectedImageArea.sx) / image.zoom;
    let height = roundMultipleOf8(event.offsetY - selectedImageArea.sy) / image.zoom;

    selectedImageArea.ex = selectedImageArea.sx + width * image.zoom;
    selectedImageArea.ey = selectedImageArea.sy + height * image.zoom;

    selectedImageArea.isComplete = true;
    setRedZoneSize(selectedImageArea);
    copy();
}

function downloadTilesetAsImage()
{
    const scene = game.scene.getScene('RightPanelScene') as RightPanelScene;
    scene.saveAssets(0);
}

// Red zone
function placeRedZone(x_pos: string | number, y_pos: string | number)
{
    if (selectedImageArea.isComplete) return;
    redZone.style.width = '0px';
    redZone.style.height = '0px';
    redZone.style.left = x_pos + 'px';
    redZone.style.top = y_pos + 'px';
}

function setRedZoneSize(zone: TSelectedImageArea)
{
    const x = zone.ex - zone.sx;
    const y = zone.ey - zone.sy;

    if (redZone.style.width !== x + 'px')
    {
        redZone.style.width = x + 'px';
    }

    if (redZone.style.height !== y + 'px')
    {
        redZone.style.height = y + 'px';
    }
}

function resetRedZone()
{
    redZone.style.width = '0px';
    redZone.style.height = '0px';
    redZone.style.left = '0px';
    redZone.style.top = '0px';
}

// Zoom
function onMouseWheel(event)
{
    if (event.ctrlKey) event.preventDefault();

    // zoom image
    if (event.ctrlKey && event.target.id === 'imageCanvas' && image.isLoaded)
    {
        if (selectedImageArea.isComplete) resetSelection(event);

        let scrollX: number, scrollY: number;
        if (event.wheelDelta > 0)
        {
            if (image.zoom === 64) return;
            image.zoom = clamp(image.zoom * 2, 0, 64);
            scrollX = (event.offsetX - event.clientX / 2) * 2;
            scrollY = (event.offsetY - (event.clientY - navbarHeight) / 2) * 2;

        }
        else if (event.wheelDelta < 0)
        {
            if (image.zoom < 0.02) return;
            image.zoom /= 2;
            scrollX = (event.offsetX - event.clientX * 2) / 2;
            scrollY = (event.offsetY - (event.clientY - navbarHeight) * 2) / 2;
        }

        imageCanvas.style.width = image.width * image.zoom + 'px';
        imageCanvas.style.height = image.height * image.zoom + 'px';
        leftPanel.scroll(scrollX, scrollY);
    }
}

// Key press
function handleKeyPress(event: KeyboardEvent)
{

    if (event.ctrlKey && event.key === 's' && tileset.isLoaded)
    {
        event.preventDefault();
        downloadTilesetAsImage();
        return;
    }

    if (event.ctrlKey === false && event.key === 'x' && selectedImageArea.data !== undefined)
    {
        // flipX();
        return;
    }

    if (event.ctrlKey === false && event.key === 'y' && selectedImageArea.data !== undefined)
    {
        // flipY();
        return;
    }
}

// Utils
function resetZone()
{
    selectedImageArea.sx = 0;
    selectedImageArea.sy = 0;
    selectedImageArea.ex = 0;
    selectedImageArea.ey = 0;
    selectedImageArea.isDirty = false;
}

function drawImage(canvas: HTMLCanvasElement, img: HTMLImageElement, x = 0, y = 0)
{
    const ctx = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, x, y);
}

function clamp(number: number, min: number, max: number)
{
    return Math.max(min, Math.min(number, max));
}

function roundMultipleOf8(num: number)
{
    const size = 8;
    return Math.round(num / size) * size;
}

function resetSelection(event: MouseEvent)
{
    event.stopPropagation();
    event.preventDefault();
    resetZone();
    resetRedZone();
    selectedImageArea.isComplete = false;
}
