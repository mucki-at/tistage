import * as THREE from "three";
import * as utils from "./utils.mjs";

export class Units {
    static #unitNames = ["cruiser","carrier","destroyer","dreadnaught","fighter","flagship","infantry","mech","pds","spacedock","warsun"];
    static #dispatch = new THREE.EventDispatcher();
    static #template = utils.gltf
        .loadAsync("Saunick.glb")
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
            window.updateRoom();
            return template;
        })
        .catch((reason) => {
            console.error("Error loading Saunick.glb:", reason);
            return { fighter: null, destroyer: null, cruiser: null };
        });

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
            window.updateRoom();
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
        this.color="white";

        Units.registerUnit(this);
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
            if (this.material) this.material.dispose();
            this.material = source.material.clone();
            this.material.color.setStyle(this.color);
        }
    }

    setColor(color)
    {
        this.color=color
        if (this.material) this.material.color.setStyle(this.color);
    }
}