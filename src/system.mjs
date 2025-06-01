import * as THREE from "three";
import * as utils from "./utils.mjs";

export class System extends THREE.Group {
    static #RepoURL =
        "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources";

    static #template = utils.gltf
        .loadAsync("System.glb")
        .then((result) => {
            const top = result.scene.getObjectByName("top");
            const sides = result.scene.getObjectByName("sides");
            return { top: top, sides: sides };
        })
        .catch((reason) => {
            console.error("Error loading System.glb:", error);
            return { top: undefined, sides: undefined };
        });

    static getDescription(systemId) {
        const id2 = systemId.toString().padStart(2, "0");
        return fetch(`${System.#RepoURL}/systems/${id2}.json`).then((response) =>
            response.json()
        );
    }

    constructor(id) {
        super();

        System.#template.then((parts) => {
            const top = parts.top.clone();
            this.add(top);
            this.add(parts.sides.clone());

            System.getDescription(id)
                .then((data) => {
                    utils
                        .LoadTextureAsync(
                            `${System.#RepoURL}/tiles/${data.imagePath}`
                        )
                        .then((texture) => {
                            const topMat = top.material.clone();
                            topMat.map = texture;
                            top.material = topMat;
                            window.updateRoom();
                        })
                        .catch((error) => {
                            console.error(
                                `Error loading '${data.imagePath}':`,
                                error
                            );
                        });
                })
                .catch((error) => {
                    console.error(
                        `Error fetching description for system ${id}:`,
                        error
                    );
                });
        });
        /*
    

    fetch(System.RepoURL + "systems/" + id2 + ".json")
      .then((response) => response.json())
      .then((data) => {
        // Use the data here
        utils.gltf.loadAsync("System.glb").then((result) => {
          const top = result.scene.getObjectByName("top");
          

          this.add(result.scene.getObjectByName("sides"));
        });
      })
      .catch((error) => {
        console.error("Error fetching JSON:", error);
      });
    */
    }
}
