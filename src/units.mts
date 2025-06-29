import * as THREE from "three";
import { Room } from "./room.mts";
import * as utils from "./utils.mts";

type UnitTemplate = Map<string, THREE.Mesh>;

interface MeshLoadedEvent
{
    template: UnitTemplate;
}

class MeshLoadedEventDispatcher extends THREE.EventDispatcher<{ meshLoaded: MeshLoadedEvent }>
{
    meshLoaded(template: UnitTemplate) {
        this.dispatchEvent({
            type: "meshLoaded",
            template: template,
        });
    }
}

export class Units {
    static #unitNames = [
        "cruiser",
        "carrier",
        "destroyer",
        "dreadnaught",
        "fighter",
        "flagship",
        "infantry",
        "mech",
        "pds",
        "spacedock",
        "warsun",
    ];

    static #dispatch = new MeshLoadedEventDispatcher();

    static #colors = utils.gltf
        .loadAsync("colors.glb")
        .then((result) => {
            let colors = new Map<string, THREE.Material>();
            for (let obj of result.scene.children) {
                if (obj instanceof THREE.Mesh) {
                    for (let name of obj.name.split("_")) {
                        colors.set(name, obj.material);
                    }
                }
            }
            return colors;
        })
        .catch((reason) => {
            console.error("Error loading colors.glb:", reason);
            return new Map<string, THREE.Material>();
        });

    static #template = utils.gltf
        .loadAsync("saunick.glb")
        .then((result) => {
            var units = new Map<string, THREE.Mesh>();
            Units.#unitNames.forEach((name) => {
                let obj = result.scene.getObjectByName(name);
                if (obj instanceof THREE.Mesh) {
                    units.set(name, obj);
                }
            });
            return units;
        })
        .then((template) => {
            Units.#dispatch.meshLoaded(template);
            Room.updateRoom();
            return template;
        })
        .catch((reason) => {
            console.error("Error loading saunick.glb:", reason);
            return new Map<string, THREE.Mesh>();
        });

    static getColorAsync(color:string) {
        return Units.#colors.then((colors) => colors.get(color) ?? utils.ErrorMaterial);
    }

    static registerUnit(unit:Unit) {
        Units.#dispatch.addEventListener(
            "meshLoaded",
            unit.onMeshLoaded
        );
        Units.#template.then((template) => {
            Units.#dispatch.meshLoaded(template);
            Room.updateRoom();
        });
    }

    static unregisterUnit(unit:Unit) {
        Units.#dispatch.removeEventListener(
            "meshLoaded",
            unit.onMeshLoaded
        );
    }
}

export class Unit extends THREE.Mesh
{
    width=0;
    height=0;
    length=0;
    sustained=false;
    color = "white";
    onMeshLoaded = this.#onMeshLoaded.bind(this);

    constructor(id: string) {
        super();
        this.name = id;
        this.castShadow = true; //default is false

        Units.registerUnit(this);
        Units.getColorAsync("white").then((material) => {
            this.material = material;
            Room.updateRoom();
        });
    }

    dispose() {
        Units.unregisterUnit(this);
    }

    #onMeshLoaded(event: MeshLoadedEvent)
    {
        const source = event.template.get(this.name);
        if (!source) {
            return;
        }

        if (this.geometry != source.geometry) {
            this.geometry = source.geometry;

            if (this.geometry.boundingBox)
            {
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
            }
            else
            {
                this.width = 0;
                this.height = 0;
                this.length = 0;
            }
        }
    }

    setColor(color:string)
    {
        this.color = color;
        Units.getColorAsync(color).then((material) => {
            this.material = material;
            Room.updateRoom();
        });
    }

    onObjectSelected(_event: MouseEvent, _intersect: THREE.Intersection)
    {
        document.querySelector("#unit > #name")!.innerHTML = this.name;
        document.querySelector("#unit > #color")!.innerHTML = this.color;
    }
}