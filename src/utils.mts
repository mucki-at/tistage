import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// setup a default gltf loader with draco extensions already configured
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

export const gltf = new GLTFLoader();
gltf.setDRACOLoader(dracoLoader);

export const ErrorTexture = new THREE.DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1);
export const ErrorMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });

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
            return ErrorMaterial;
        });
}

export function loadGltfMeshesAsync(url: string): Promise<Map<string,THREE.Mesh>> {
    return gltf
        .loadAsync(url)
        .then((result) => {
            const template = new Map<string, THREE.Mesh>();
            result.scene.children.forEach((obj) => {
                if (obj instanceof THREE.Mesh)
                {
                    template.set(obj.userData.name.split(".")[0], obj);
                }

            });
            return template;            
        })
        .catch((e) => {
            console.log(`Failed to load GLTF file '${url}': ${e.message}`);
            return new Map<string, THREE.Mesh>();
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
            return ErrorTexture;
        });
}

export function sleeper(ms : number) {
    return function (x:any) {
        return new Promise((resolve) => setTimeout(() => resolve(x), ms));
    };
}

export function makePromise<T>(thing: T) : Promise<T>
{
    return new Promise<T>((resolve, _) => {
            resolve(thing);
        });
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

export function extractColorInformation(material : THREE.Material)
{
    let color = ErrorMaterial.color;
    let map = ErrorMaterial.map;
    if (("color" in material) && (material.color instanceof THREE.Color))
    {
        color = material.color;
    }
    if (("map" in material) && (material.map instanceof THREE.Texture))
    {
        map = material.map;
    }
    return { color: color, map: map };
}

export function replaceColorInformation(material: THREE.Material | THREE.Material[], color: THREE.Color | undefined, map: THREE.Texture | undefined, clone: boolean) : typeof material
{
    if (Array.isArray(material)) {
        return material.map((mat) =>
            replaceColorInformation(mat, color, map, clone)
        ) as THREE.Material[];
    }
    else
    {
        if (clone) {
            material = material.clone();
        }

        if (color && "color" in material) {
            material.color = color;
        }
        if (map && "map" in material) {
            material.map = map;
        }
        return material;            
    }
}