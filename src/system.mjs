import * as THREE from "three";
import * as utils from "./utils.mjs";

export class System extends THREE.Group
{
    static RepoURL="https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources/"

    constructor(id)
    {
        super()
        
        const id2 = id.toString().padStart(2, "0");

        fetch(System.RepoURL+"systems/"+id2+".json")
            .then(response => response.json())
            .then(data => {

               // Use the data here
                utils.gltf.loadAsync("System.glb").then((result) => {
                    const top = result.scene.getObjectByName("top");
                    new THREE.TextureLoader()
                        .loadAsync(System.RepoURL + "tiles/" + data.imagePath)
                        .then((texture) => {
                            texture.colorSpace = THREE.SRGBColorSpace;
                            texture.flipY = false;
                            top.material.map = texture;
                            this.add(top);
                            window.updateRoom();
                        });

                    this.add(result.scene.getObjectByName("sides"));
                });

            })
            .catch(error => {
                console.error('Error fetching JSON:', error);
            });
    }
    
} 

