import * as THREE from "three";
import * as utils from "./utils.mjs";

export class System extends THREE.Mesh
{
    constructor()
    {
        var geom=new THREE.CircleGeometry(0.05, 6)
        geom.rotateX(-Math.PI / 2);
        geom.translate(0, 0.001, 0);
        super(geom);

        const texture = new THREE.TextureLoader().load(
          "https://cdn.statically.io/gh/AsyncTI4/TI4_map_generator_bot/master/src/main/resources/tiles/18_MR.png?raw=true"
        );
        // immediately use the texture for material creation

        this.material = new THREE.MeshStandardMaterial({ map: texture });
    }
    
} 

