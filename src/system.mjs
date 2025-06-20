import * as THREE from "three";
import * as utils from "./utils.mjs";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

export class System extends THREE.Group {
    static #RepoURL =
        "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources";

    static #template = utils.gltf
        .loadAsync("System.glb")
        .then((result) => {
            const top = result.scene.getObjectByName("top");
            const sides = result.scene.getObjectByName("sides");

            let types = [];

            for (let i = 1; i <= 15; ++i) {
                const i2 = i.toString().padStart(2, "0");
                const i3 = i.toString().padStart(3, "0");
                const type = result.scene.getObjectByName(`TYPE${i2}`);

                const space = type.getObjectByName(`space${i3}`);
                space.sampler = new MeshSurfaceSampler(space).build();
                let planets = [];
                for (let j = 0; j < 3; ++j) {
                    const p = type.getObjectByName(`planet${j}${i3}`);
                    if (p) {
                        p.sampler = new MeshSurfaceSampler(p).build();
                        planets[j] = p;
                    }
                }
                types[`TYPE${i2}`] = { space: space, planets: planets };
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
        this.locations = new Map();

        System.#template.then((parts) => {
            const top = parts.top?.clone();
            this.add(top);
            this.add(parts.sides?.clone());
            window.updateRoom();

            System.getDescription(id)
                .then((data) => {
                    this.description = data;
                    let type = parts.types[data.shipPositionsType];
                    if (this.locations.has("space"))
                    {
                        let loc = this.locations.get("space");
                        loc.offset = type.space.position;
                        loc.sampler = type.space.sampler;
                    }
                    else
                    {
                        this.locations.set("space",{
                            units: [],
                            offset: type.space.position,
                            sampler: type.space.sampler
                        });
                    }

                    data.planets.forEach((name, index)=> {
                        const p = type.planets[index];
                        if (this.locations.has(name))
                        {
                            let loc = this.locations.get(name);
                            loc.offset = p.position;
                            loc.sampler = p.sampler;
                        }
                        else
                        {
                            this.locations.set(name, {
                                units: [],
                                offset: p.position,
                                sampler: p.sampler
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
            this.locations.set(location, {
                units: [unit],
                offset: null,
                sampler: null,
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
        this.locations.forEach((location, name, map) => {
            const sampler = location.sampler;
            if (sampler) {
                location.units.forEach((unit) => {
                    sampler.sample(unit.position);
                    unit.position.add(location.offset);
                    unit.quaternion.identity();
                    unit.rotateY(THREE.MathUtils.randFloat(-Math.PI, Math.PI));
                    unit.rotateX(THREE.MathUtils.randFloat(-0.01, 0.01));
                    unit.rotateZ(THREE.MathUtils.randFloat(-0.01, 0.01));
                });
            }
        });
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
