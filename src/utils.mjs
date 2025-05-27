import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";


// setup a default gltf loader with draco extensions already configured
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

export const gltf = new GLTFLoader();
gltf.setDRACOLoader(dracoLoader);

export function asyncLoadGltfMaterial(material)
{
    return gltf
      .loadAsync(material)
      .then((result) => result.scene.children[0].material)
      .catch((e) => console.error(`Critical failure: ${e.message}`));
}

