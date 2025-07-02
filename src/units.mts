import * as THREE from "three";
import { Room } from "./room.mts";
import * as utils from "./utils.mts";
import { TemplateLoader } from "./template.mts";

export class UnitLoader extends TemplateLoader<THREE.Mesh>
{
    handleLoadTemplateAsync(url: string)
    {
        return utils.gltf
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
    }

    handleUpdateComplete() : void
    {
        Room.updateRoom();
    }
}

export class ColorLoader extends TemplateLoader<THREE.Material> {
    handleLoadTemplateAsync(url: string) {
        return utils.gltf.loadAsync(url).then((result) => {
            let colors = new Map<string, THREE.Material>();
            for (let obj of result.scene.children) {
                if (obj instanceof THREE.Mesh) {
                    for (let name of obj.name.split("_")) {
                        colors.set(name, obj.material);
                    }
                }
            }
            return colors;
        });
    }

    handleUpdateComplete(): void {
        Room.updateRoom();
    }
}

export class Unit extends THREE.Mesh {
    static models = new UnitLoader();
    static colors = new ColorLoader();

    width = 0;
    height = 0;
    length = 0;
    sustained = false;
    color = "white";
    modelMaterial : THREE.Material | THREE.Material[] | null = null;
    colorMaterial : THREE.Material | null = null;

    constructor(id: string) {
        super();
        this.name = id;
        this.castShadow = true; //default is false

        Unit.models.addConsumer(this, this.onModelUpdated);
        Unit.colors.addConsumer(this, this.onColorUpdated);
    }

    dispose() {
        Unit.models.removeConsumer(this);
    }

    setColor(color: string) {
        this.color = color;
        Unit.colors.oneshot(this, this.onColorUpdated);
    }

    onObjectSelected(_event: MouseEvent, _intersect: THREE.Intersection) {
        document.querySelector("#info > #name")!.innerHTML = this.name;
        document.querySelector("#unit > #color")!.innerHTML = this.color;
    }

    onModelUpdated(template: Map<string, THREE.Mesh>): void {
        const source = template.get(this.name);
        if (!source) {
            return
        }

        if (this.geometry != source.geometry) {
            this.geometry = source.geometry;
            this.modelMaterial = source.material;
            this.reconcileMaterials();

            if (this.geometry.boundingBox) {
                this.width =
                    (this.geometry.boundingBox.max.x -
                        this.geometry.boundingBox.min.x) *
                    1000;
                this.height =
                    (this.geometry.boundingBox.max.y -
                        this.geometry.boundingBox.min.y) *
                    1000;
                this.length =
                    (this.geometry.boundingBox.max.z -
                        this.geometry.boundingBox.min.z) *
                    1000;

                // if unit is nearly a box, assume it is a circle.
                if (Math.abs(this.width - this.length) < 1) {
                    this.width /= 2;
                    this.length = 0;
                }
            } else {
                this.width = 0;
                this.height = 0;
                this.length = 0;
            }
        }
    }

    onColorUpdated(template: Map<string, THREE.Material>)
    {
        this.colorMaterial = template.get(this.color) ?? null;
        this.reconcileMaterials();
    }

    reconcileMaterials()
    {
        if (this.modelMaterial == null)
        {
            this.material = this.colorMaterial ?? utils.ErrorMaterial;
        }
        else
        {
            const color = utils.extractColorInformation(this.colorMaterial ?? utils.ErrorMaterial);
            let mat = this.modelMaterial;
            if (Array.isArray(mat))
            {
                this.material = mat;
            }
            else
            {
                if (("color" in mat) || ("map" in mat))
                {
                    const colorMat=mat.clone();
                    if ("color" in colorMat)
                    {
                        colorMat.color = color.color;
                    }
                    if ("map" in colorMat)
                    {
                        colorMat.map = color.map;
                    }
                    this.material=colorMat;
                }
                else
                {
                    this.material=mat;
                }
            }
        }
    }
}

