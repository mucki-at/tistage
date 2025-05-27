import {Mesh, CircleGeometry} from "three";
import * as utils from "./utils.mjs";

export class Table extends Mesh
{
    constructor(radius, texture)
    {
        var geom=new CircleGeometry(radius, 6)
        geom.rotateX(-Math.PI / 2);
        super(geom);

        utils
          .asyncLoadGltfMaterial(texture)
          .then((mat) => {
            this.material = mat;
            window.updateRoom();
          });
    }

} 

