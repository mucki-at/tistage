import * as THREE from "three";
import { Room } from "./room.mjs";
import * as utils from "./utils.mjs";

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
    static #dispatch = new THREE.EventDispatcher();

    static #colors = utils.gltf
        .loadAsync("colors.glb")
        .then((result) => {
            let factions = {};
            for (let obj of result.scene.children)
            {
                let names=obj.name.split("_");
                for (let name of names)
                {
                    factions[name] = obj.material;
                }
            }
            return factions;
        })
        .catch((reason) => {
            console.error("Error loading colors.glb:", reason);
            return { };
        });
    static #template = utils.gltf
        .loadAsync("saunick.glb")
        .then((result) => {
            var units = {};
            Units.#unitNames.forEach((name) => {
                units[name] = result.scene.getObjectByName(name);
            });
            return units;
        })
        .then((template) => {
            Units.#dispatch.dispatchEvent({
                type: "meshLoaded",
                template: template,
            });
            Room.updateRoom();
            return template;
        })
        .catch((reason) => {
            console.error("Error loading saunick.glb:", reason);
            return { fighter: null, destroyer: null, cruiser: null };
        });

    static getColorAsync(color) {
        return Units.#colors.then((colors) => {
            if (color in colors)
            {
                return colors[color];
            }
            else
            {
                return utils.ErrorMaterial;
            }
        });
    }
    static registerUnit(unit) {
        Units.#dispatch.addEventListener(
            "meshLoaded",
            unit.onMeshLoaded.bind(unit)
        );
        Units.#template.then((template) => {
            Units.#dispatch.dispatchEvent({
                type: "meshLoaded",
                template: template,
            });
            Room.updateRoom();
        });
    }

    static unregisterUnit(unit) {
        Units.#dispatch.removeEventListener(
            "meshLoaded",
            unit.onLoaded.bind(unit)
        );
    }
}

export class Unit extends THREE.Mesh {
    constructor(id) {
        super();
        this.name = id;
        this.castShadow = true; //default is false
        this.color = "white";

        Units.registerUnit(this);
        Units.getColorAsync("white").then((material) => {
            this.material=material;
            Room.updateRoom();
        });
    }

    dispose() {
        unregisterUnit(this);
        super.dispose();
    }

    onMeshLoaded(event) {
        const source = event.template[this.name];
        if (!source) {
            return;
        }

        if (this.geometry != source.geometry) {
            this.geometry = source.geometry;
        }
    }

    setColor(color)
    {
        this.color=color;
        Units.getColorAsync(color).then((material) => {
            this.material = material;
            Room.updateRoom();
        });
     }

    onObjectSelected(event, intersection)
    {
        document.querySelector("#unit > #name").innerHTML = this.name;
        document.querySelector("#unit > #color").innerHTML = this.color;
    }
}