import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// setup a default gltf loader with draco extensions already configured
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

export const gltf = new GLTFLoader();
gltf.setDRACOLoader(dracoLoader);

const errorTexture = new THREE.DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1);
const errorMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });

export function loadGltfMaterialAsync(url : string) : Promise<THREE.Material>
{
    
    return gltf
        .loadAsync(url)
        .then((result) => {
            const obj=result.scene.children[0];
            if ("material" in obj)
            {
                return obj.material as THREE.Material;
            }
            else
            {
                throw new Error("scene object doesn't contain material");
            }
        })
        .catch((e) => {
            console.log(`Failed to load GLTF material '${url}': ${e.message}`);
            return errorMaterial;
        });
}

export const textures = new THREE.TextureLoader();

export function loadTextureAsync(
    url:string,
    flipY:boolean = false,
    colorSpace:string = THREE.SRGBColorSpace
) : Promise<THREE.Texture>
{
    return textures
        .loadAsync(url)
        .then((texture) => {
            texture.colorSpace = colorSpace;
            texture.flipY = flipY;
            return texture;
        })
        .catch((e) => {
            console.error(`Failed to load texture '${url}': ${e.message}`);
            return errorTexture;
        });
}

export function sleeper(ms : number) {
    return function (x:any) {
        return new Promise((resolve) => setTimeout(() => resolve(x), ms));
    };
}

export function loadJsonAsync(url:string)
{
    // Example: Load a JSON file using fetch
    return fetch(url) // Replace 'data.json' with the path to your JSON file
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json(); // Parse the JSON from the response
        });
}