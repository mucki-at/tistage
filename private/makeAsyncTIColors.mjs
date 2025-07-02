import * as THREE from "three"
import { TextureLoader, GLTFExporter } from "node-three-gltf"
import fs from "node:fs"
import { createCanvas } from "canvas";

const outname = process.argv[2];
if (!outname)
{
    console.log(`Usage: node makeAsyncTIColors.js <outputfile>`);
    process.exit(-1);
}

function loadJson(url)
{
    return fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to download ${url}: ${response.status}`);
            }
            return response.json(); // Parse the JSON from the response
        });    
}

// build name map
const colors = new Map();

// solid colors
console.log("Fetching solid color definitions...");
const solidColors = await loadJson(
    "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/master/src/main/resources/data/colors/solidColors.json"
);

console.log("Building solid color definitions...");
for (let def of solidColors)
{
    const color = {
        names: [def.alias, def.name].concat(def.aliases),
        fallback: def.hue,
        image: null,
        color: `rgb(${def.primaryColor.red},${def.primaryColor.green},${def.primaryColor.blue})`,
        material: new THREE.MeshStandardMaterial(),
    };
    color.material.color=new THREE.Color(color.color);
    colors.set(def.name, color);
}

// gradient colors
const canvasSize=32

console.log("Fetching gradient color definitions...");
const gradientColors = await loadJson(
    "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/master/src/main/resources/data/colors/gradientColors.json"
);

console.log("Building gradient color definitions...");
let canvas = createCanvas(1, canvasSize);
let ctx=canvas.getContext("2d");
const loader=new TextureLoader();

for (let def of gradientColors) {
    ctx.clearRect(0, 0, 1, canvasSize);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize - 1);
    gradient.addColorStop(
        0,
        `rgb(${def.primaryColor.red},${def.primaryColor.green},${def.primaryColor.blue})`
    );
    gradient.addColorStop(
        1,
        `rgb(${def.secondaryColor.red},${def.secondaryColor.green},${def.secondaryColor.blue})`
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, canvasSize);
    const color = {
        names: [def.alias, def.name].concat(def.aliases),
        fallback: def.hue,
        image: ctx.getImageData(0, 0, 1, canvasSize, {
            colorSpace: "srgb",
        }),
        color: `rgb(${def.primaryColor.red},${def.primaryColor.green},${def.primaryColor.blue})`,
        material: new THREE.MeshStandardMaterial(),
    };
    const png = canvas.toDataURL();
    color.material.map = await loader.loadAsync(png);
    color.material.map.colorSpace = THREE.SRGBColorSpace;
    color.material.map.wrapS = THREE.ClampToEdgeWrapping;
    color.material.map.wrapT = THREE.ClampToEdgeWrapping;
    colors.set(def.name, color);
}

// split colors
console.log("Fetching split color definitions...");
const splitColors = await loadJson(
    "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/master/src/main/resources/data/colors/splitColors.json"
);

console.log("Building split color definitions...");
canvas = createCanvas(canvasSize, canvasSize);
ctx = canvas.getContext("2d");

for (let def of splitColors) {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const left = colors.get(def.primaryColorRef);
    const right = colors.get(def.secondaryColorRef);

    if (left.image)
    {
        for (let x=0; x<canvasSize/2; x+=left.image.width)
        {
            ctx.putImageData(left.image, x, 0);
        }
    }
    else
    {
        ctx.fillStyle=left.color;
        ctx.fillRect(0,0,canvasSize/2,canvasSize);
    }

    if (right.image) {
        for (let x = canvasSize / 2; x < canvasSize; x += right.image.width) {
            ctx.putImageData(right.image, x, 0);
        }
    } else {
        ctx.fillStyle = right.color;
        ctx.fillRect(canvasSize/2 , 0, canvasSize / 2, canvasSize);
    }
    
    const color = {
        names: [def.alias, def.name].concat(def.aliases),
        fallback: def.hue,
        image: ctx.getImageData(0, 0, canvasSize, canvasSize, {
            colorSpace: "srgb",
        }),
        color: left.color,
        material: new THREE.MeshStandardMaterial(),
    };
    const png = canvas.toDataURL();
    color.material.map = await loader.loadAsync(png);
    color.material.map.colorSpace = THREE.SRGBColorSpace;
    color.material.map.wrapS = THREE.ClampToEdgeWrapping;
    color.material.map.wrapT = THREE.ClampToEdgeWrapping;
    colors.set(def.name, color);
}


// build GLTF scene
console.log("Building GLTF...");
const box=new THREE.BoxGeometry();
const scene=new THREE.Scene();
let x=0;
colors.forEach((color, name) => {
    const swab = new THREE.Mesh(box, color.material);
    swab.name = color.names.join(" ");
    swab.position.set(x, 0, 0);
    x += 1;
    scene.add(swab);
});

const exporter=new GLTFExporter();
const blob = await exporter.parseAsync(scene, {binary: true});
console.log(`Writing GLTF to ${outname}`);
fs.writeFileSync(outname, blob);
process.exit(0);


