import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Room } from "./room.mts";
import { Table } from "./table.mts";
import * as utils from "./utils.mts";

const drawingboard = document.getElementById("drawingboard")!;
const canvas: HTMLCanvasElement = document.createElement("canvas")!;
canvas.width = 1024;
canvas.height = 1024;
canvas.style.backgroundColor = "black";
drawingboard.appendChild(canvas);
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;

const factionUrl = "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources/factions/"

const options = {
    faction: "arborec",
    color: "#0091ff",
    nebula: 0.8,
    size: 512.0,
    textureTest: textureTest,
    tokenTest: tokenTest,
    allTokens: allTokens,
};

const gui=new GUI();
gui.add(options, "faction");
gui.addColor(options, "color");
gui.add(options, "nebula", 0, 1);
gui.add(options, "size", 16, 1024);
gui.add(options, "textureTest");
gui.add(options, "tokenTest");
gui.add(options, "allTokens");


async function loadImageAsync(url: string) : Promise<HTMLImageElement>
{
    return new Promise((r) => {
        let i = new Image();
        i.onload = () => r(i);
        i.crossOrigin = "anonymous";
        i.src = url;
    });
}

const starfield = loadImageAsync("private/starfield.png");
const nebula = loadImageAsync("private/nebula.png");

async function generateFactionTexture(factionName: string, color: string, size: number) : Promise<THREE.Texture>
{
    const faction = loadImageAsync(factionUrl + factionName + ".png");
    return Promise.all([starfield, nebula, faction]).then(([starfield, nebula, faction]) =>
    {
        const composed = new OffscreenCanvas(
            starfield.width,
            starfield.height
        );
        const ctx = composed.getContext("2d")!;

        // step 1: paint a pixel so we get the correct rgb values for our color
        ctx.reset();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const rgba = ctx.getImageData(0, 0, 1, 1).data;

        // step 2: paint nebula and colorize it
        ctx.reset();
        ctx.clearRect(0, 0, composed.width, composed.height);
        ctx.drawImage(nebula, 0, 0);
        const imageData = ctx.getImageData(
            0,
            0,
            composed.width,
            composed.height
        );
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i + 0] = (data[i + 0] * rgba[0]) / 255;
            data[i + 1] = (data[i + 1] * rgba[1]) / 255;
            data[i + 2] = (data[i + 2] * rgba[2]) / 255;
            data[i + 3] *= options.nebula;
        }
        ctx.putImageData(imageData, 0, 0);

        // step 3: paint the starfield "under" the nebula
        ctx.globalCompositeOperation = "destination-over"
        ctx.drawImage(starfield, 0, 0);

        // step 4: put the faction icon on top
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(
            faction,
            (composed.width - size) / 2,
            (composed.height - size) / 2,
            size,
            size
        );

        // step 4: paint border color in top left
        ctx.fillStyle="rgb(32,32,32)";
        ctx.fillRect(0,0,composed.width/16,composed.height/16);
        const tex= new THREE.CanvasTexture(composed, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearMipMapLinearFilter, THREE.RGBAFormat, THREE.UnsignedByteType);
        tex.flipY = false;
        return tex;
    })
}

function textureTest()
{
    drawingboard.hidden=false;

    generateFactionTexture(options.faction, options.color, options.size).then((tex) =>
    {
        ctx.reset();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tex.image, 0, 0);
    });
}


const room = new Room();
room.init("old_room", 0.1, 2).then(Room.updateRoom);

const table = new Table(0.7, "wood_cabinet_worn_long_4k.gltf");
room.add(table);

const tokens = await utils.loadGltfMeshesAsync("tokens_low.glb");
const cc=tokens.get("command")!;
const own = tokens.get("own")!;

let testCC : THREE.Mesh | undefined;
let testOwn: THREE.Mesh | undefined;

function tokenTest() {
    drawingboard.hidden = true;
    if (testCC)
    {
        testCC.removeFromParent();
        testCC = undefined;
    }
    if (testOwn) {
        testOwn.removeFromParent();
        testOwn = undefined;
    }
    
    generateFactionTexture(options.faction, options.color, options.size).then((tex) => {
        testCC = cc.clone();
        testCC.material = utils.replaceColorInformation(testCC.material, new THREE.Color(0xFFFFFF), tex, true);
        testCC.position.set(-0.15,0.01,0);
        testCC.scale.set(10,10,10);
        table.add(testCC);

        testOwn = own.clone();
        testOwn.material = utils.replaceColorInformation(
            testOwn.material,
            new THREE.Color(0xffffff),
            tex,
            true
        );
        testOwn.position.set(0.15, 0.01, 0);
        testOwn.scale.set(10, 10, 10);
        table.add(testOwn);

        Room.updateRoom();
    });

}


const allTok: THREE.Mesh[] = [];
const factions = [
    "sardakk","arborec", "argent", "letnev", "saar", "keleres",
    "muaat", "hacan", "empyrean", "sol", "ghost", "l1z1x",
    "lazax", "mahact", "mentak", "naalu", "naaz", "nekro",
    "nomad", "titans", "jolnar", "cabal", "winnu", "xxcha",
    "yin", "yssaril"
];
const factionColors = [
    "rgb(167,44,37)",
    "rgb(167,190,48)",
    "rgb(221,147,40)",
    "rgb(133,107,110)",
    "rgb(193,112,5)",
    "rgb(255,255,2555)",

    "rgb(233,146,32)",
    "rgb(157,130,12)",
    "rgb(132,34,169)",
    "rgb(57,146,179)",
    "rgb(75,151,211)",
    "rgb(52,104,154)",

    "rgb(255,255,2555)",
    "rgb(160,124,23)",
    "rgb(178,125,30)",
    "rgb(211,131,32)",
    "rgb(144,192,54)",
    "rgb(166,46,39)",

    "rgb(131,207,233)",
    "rgb(239,88,240)",
    "rgb(151,106,165)",
    "rgb(195,49,50)",
    "rgb(125,4,224)",
    "rgb(19,191,120)",

    "rgb(200,200,200)",
    "rgb(22,179,31)",
];
    
function allTokens()
{
    drawingboard.hidden = true;
    for (const tok of allTok) tok.removeFromParent();
    allTok.splice(0);

    const pitch = Math.ceil(Math.sqrt(factions.length));
    const w = 0.03;
    const h = 0.05;
    const xOfs = -(w * pitch)/2
    const yOfs = -(h * pitch) / 2;

    for (let i=0; i<factions.length; ++i)
    {
        const x = i % pitch;
        const y = Math.floor(i / pitch);

        generateFactionTexture(factions[i], factionColors[i], options.size).then(
            (tex) => {
                testCC = cc.clone();
                testCC.material = utils.replaceColorInformation(
                    testCC.material,
                    new THREE.Color(0xffffff),
                    tex,
                    true
                );
                testCC.position.set(xOfs + x * w, 0.001, yOfs + y * h - h/4);
                table.add(testCC);
                allTok.push(testCC);

                testOwn = own.clone();
                testOwn.material = utils.replaceColorInformation(
                    testOwn.material,
                    new THREE.Color(0xffffff),
                    tex,
                    true
                );
                testOwn.position.set(xOfs + x * w, 0.001, yOfs + y * h + h/4);
                table.add(testOwn);
                allTok.push(testOwn);

                Room.updateRoom();
            }
        );
    }
}
