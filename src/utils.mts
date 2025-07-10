import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// setup a default gltf loader with draco extensions already configured
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

export const gltf = new GLTFLoader();
gltf.setDRACOLoader(dracoLoader);

export const ErrorTexture = new THREE.DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1);
export const ErrorMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff , map:ErrorTexture});

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

export interface ColorMaterial
{
    color?: THREE.Color;
    map?: THREE.Texture | null;
}
export type ColorInformation = ColorMaterial[]

function isColorMaterial(mat: THREE.Material): mat is THREE.Material & ColorMaterial
{
    return ((!("color" in mat) || (mat.color instanceof THREE.Color)) &&
        (!("map" in mat) || (mat.map === null) || (mat.map instanceof THREE.Texture)));
}

export function getColorFromMaterial(mat: THREE.Material) : ColorMaterial
{
    if (isColorMaterial(mat)) {
        return mat;
    } else if (("map" in mat) && (mat.map instanceof THREE.Texture)) {
        return { map: mat.map };
    } else if (("color" in mat) && (mat.color instanceof THREE.Color)) {
        return { color: mat.color };
    } else {
        return {};
    }
}

export function replaceMaterialColor(
    material: THREE.Material,
    color: ColorMaterial,
    clone: boolean
): THREE.Material {
    if (clone) {
        material = material.clone();
    }

    if (color.color && "color" in material) {
        material.color = color.color;
    }
    if (color.map && "map" in material) {
        material.map = color.map;
    }
    return material;
}

export function getColors(object: THREE.Object3D) : ColorInformation
{
    let result : ColorInformation = [];

    if ("material" in object)
    {
        if (Array.isArray(object.material))
        {
            result.concat(object.material.map((mat)=>getColorFromMaterial(mat)));
        }
        else if (object.material)
        {
            result.push(getColorFromMaterial(object.material as THREE.Material))
        }
        else
        {
            result.push({});
        }
    }

    for (const c of object.children)
    {
        result.concat(getColors(c))
    }

    return result;
}

export function putColors(object: THREE.Object3D, colors: ColorInformation, replacement : ColorMaterial={}, clone = true)
{
    if ("material" in object)
    {
        if (Array.isArray(object.material))
        {
            object.material = object.material.map(
                (mat) => replaceMaterialColor(mat, colors.shift() ?? replacement, clone)
            );
        } else if (object.material) {
            object.material = replaceMaterialColor(object.material as THREE.Material, colors.shift() ?? replacement, clone);
        } else {
            colors.shift();
        }
    }

    for (const c of object.children)
    {
        putColors(c, colors, replacement, clone);
    }
}
