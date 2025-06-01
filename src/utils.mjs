import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// setup a default gltf loader with draco extensions already configured
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

export const gltf = new GLTFLoader();
gltf.setDRACOLoader(dracoLoader);

export function asyncLoadGltfMaterial(material) {
    return gltf
        .loadAsync(material)
        .then((result) => result.scene.children[0].material)
        .catch((e) =>
            console.error(
                `Failed to load GLTF material '${material}': ${e.message}`
            )
        );
}

export const textures = new THREE.TextureLoader();

export function LoadTextureAsync(
    url,
    flipY = false,
    colorSpace = THREE.SRGBColorSpace
) {
    return textures
        .loadAsync(url)
        .then((texture) => {
            texture.colorSpace = colorSpace;
            texture.flipY = flipY;
            return texture;
        })
        .catch((e) =>
            console.error(`Failed to load texture '${url}': ${e.message}`)
        );
}

export function sleeper(ms) {
    return function (x) {
        return new Promise((resolve) => setTimeout(() => resolve(x), ms));
    };
}

