import * as THREE from "three";
import * as utils from "./utils.mjs";

export class System extends THREE.Group
{
    constructor(url)
    {
        super()
        
        utils.gltf.loadAsync("System.glb").then((result) => {
            const top=result.scene.getObjectByName("top");
            new THREE.TextureLoader().loadAsync(url).then((texture) =>
            {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.flipY = false;
                top.material = new THREE.MeshStandardMaterial({ map: texture });
                this.add(top);    
            })

            this.add(result.scene.getObjectByName("sides"));
        });
    }
    
} 

