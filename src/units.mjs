import * as THREE from "three";
import * as utils from "./utils.mjs";

export class Units {
    static #dispatch = new THREE.EventDispatcher();
    static #template = utils.gltf
        .loadAsync("Saunick.glb")
        .then((result) => {
            return {
                fighter: result.scene.getObjectByName("fighter"),
                destroyer: result.scene.getObjectByName("destroyer"),
                cruiser: result.scene.getObjectByName("cruiser"),
            };
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
        }

        if (this.material != source.material) {
            this.material = source.material;
        }
    }
}