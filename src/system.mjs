import * as THREE from "three";
import * as utils from "./utils.mjs";
import { UnitLayout } from "./unitlayout.mjs";

export class System extends THREE.Group {
    static #RepoURL =
        "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources";

    static #template = utils.gltf
        .loadAsync("System.glb")
        .then((result) => {
            const top = result.scene.getObjectByName("top");
            const sides = result.scene.getObjectByName("sides");

            const boundsObj = result.scene.getObjectByName("bounds");
            const bounds =
            {
                x: boundsObj.position.x,
                y: boundsObj.position.z,
                radius: parseFloat(boundsObj.userData.radius)
            };

            let types = {};
            for (let i = 1; i <= 15; ++i) {
                const i2 = i.toString().padStart(2, "0");
                const i3 = i.toString().padStart(3, "0");

                let planets = [];
                for (let j = 0; j < 3; ++j) {
                    const p = result.scene.getObjectByName(`planet${j}${i3}`);
                    if (p) {
                        planets[j] = {
                            x: p.position.x,
                            y: p.position.z,
                            radius: parseFloat(p.userData.radius),
                        };
                    }
                }
                types[`TYPE${i2}`] = new UnitLayout(bounds, planets);
            }

            return { top: top, sides: sides, types: types };
        })
        .catch((reason) => {
            console.error("Error loading System.glb:", reason);
            return { top: undefined, sides: undefined, types: undefined };
        });

    static getDescription(systemId) {
        const id2 = systemId.toString().padStart(2, "0");
        return fetch(`${System.#RepoURL}/systems/${id2}.json`).then(
            (response) => response.json()
        );
    }

    constructor(id) {
        super();
        this.locations = new Map(); // map of location name -> layout id and units in that location
        this.locations.set("space", { id: 0, units: [] });
        this.layout = null;

        System.#template.then((parts) => {
            const top = parts.top?.clone();
            this.add(top);
            this.add(parts.sides?.clone());

            System.getDescription(id)
                .then((data) => {
                    this.description = data;
                    this.layout = parts.types[data.shipPositionsType];

                    data.planets.forEach((name, index) => {
                        if (this.locations.has(name)) {
                            let loc = this.locations.get(name);
                            loc.id = index+1;
                        } else {
                            this.locations.set(name, {
                                id: index+1,
                                units: []
                            });
                        }
                    });
                    this.layoutUnits();

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
            window.updateRoom();
        });
    }

    addUnit(unit, location = "space", relayout = true) {
        if (!this.unitPlane) {
            const shadowGeom = new THREE.CircleGeometry(0.058, 6, 0);
            shadowGeom.rotateX(-Math.PI / 2);

            const shadowMat = new THREE.ShadowMaterial();
            shadowMat.opacity = 0.8;

            this.unitPlane = new THREE.Mesh(shadowGeom, shadowMat);
            this.unitPlane.receiveShadow = true;
            this.unitPlane.translateY(0.0018);
            this.add(this.unitPlane);
        }

        this.unitPlane.add(unit);

        if (this.locations.has(location))
        {
            let loc = this.locations.get(location);
            loc.units.push(unit);
            if (relayout) this.layoutUnits();
        }
        else
        {
            this.locations.set(location,
            {
                id: 0,
                units: [unit]
            });
        }
    }

    removeUnit(unit, relayout = true)
    {
        this.locations.forEach((name, location) => {
            const idx = location.units.indexOf(unit);
            if (idx != -1) {
                unit.removeFromParent();
                location.units.splice(idx, 1);
                if (relayout) this.layoutUnits();
            }
        });
    }

    layoutUnits()
    {
        if (this.layout)
        {
            this.locations.forEach((location, name, map) => this.layout.arrangeUnitsInArea(location.units, location.id));
        }
    }

    onObjectSelected(event, intersection) {
        document.querySelector(
            "#system > #name"
        ).innerHTML = `${this.description.name} (${this.id})`;
        console.log(JSON.stringify(this.description, null, 2));
        /*        document.querySelector("#system > #location").innerHTML = `X: ${this.tileId[0]}, Y: ${this.tileId[1]}`;
        document.querySelector(
            "#system > #description"
        ).innerHTML = `<br/><pre>${JSON.stringify(this.description, null, 2)}</pre>`;
        */
    }
}
