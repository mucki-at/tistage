import * as THREE from "three";
import { Room } from "./room.mjs";
import { Unit } from "./units.mjs";
import * as utils from "./utils.mjs";
import * as layout from "./unitlayout.mts";

interface LocationData
{
    id: number,
    units: Unit[]
}

export class System extends THREE.Group {
    static #RepoURL =
        "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources";

    static #template = utils.gltf
        .loadAsync("System.glb")
        .then((result) => {
            const top = result.scene.getObjectByName("top");
            const sides = result.scene.getObjectByName("sides");

            const boundsObj = result.scene.getObjectByName("bounds");
            const bounds = {
                x: boundsObj?.position.x ?? 0,
                y: boundsObj?.position.z ?? 0,
                radius: parseFloat(boundsObj?.userData.radius) ?? 0.058,
            };

            let types = new Map<string, layout.UnitArranger>();
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

                const l = layout.makeSystemLayout(bounds, planets);
                const s = layout.makeRandomSampler(l);
                types.set(`TYPE${i2}`, layout.makeDCArranger(l, s));
            }

            return { top: top, sides: sides, types: types };
        })
        .catch((reason) => {
            console.error("Error loading System.glb:", reason);
            return { top: undefined, sides: undefined, types: undefined };
        });

    static getDescription(systemId: number | string) {
        const id2 = systemId.toString().padStart(2, "0");
        return fetch(`${System.#RepoURL}/systems/${id2}.json`).then(
            (response) => response.json()
        );
    }

    description?: any;
    locations: Map<string,LocationData>;
    arranger?: layout.UnitArranger;
    unitPlane?: THREE.Mesh;
    tileId: number[];

    constructor(id: number | string) {
        super();
        this.locations = new Map(); // map of location name -> layout id and units in that location
        this.locations.set("space", { id: 0, units: [] });
        this.tileId = [0,0];

        System.#template.then((parts) => {
            const top = parts.top?.clone();
            const sides = parts.sides?.clone();
            if (top) this.add(top);
            if (sides) this.add(sides);

            System.getDescription(id)
                .then((data) => {
                    this.description = data;
                    this.arranger = parts.types?.get(data.shipPositionsType);

                    data.planets.forEach((name:string, index:number) =>
                    {
                        let loc = this.locations.get(name);
                        if (loc) {
                            loc.id = index + 1;
                        } else {
                            this.locations.set(name, {
                                id: index + 1,
                                units: [],
                            });
                        }
                    });
                    this.layoutUnits();

                    if (top && "material" in top && "clone")
                    {
                        utils
                            .loadTextureAsync(
                                `${System.#RepoURL}/tiles/${data.imagePath}`
                            )
                            .then((texture) => {
                                const topMat = (top.material as THREE.MeshStandardMaterial).clone();
                                topMat.map = texture;
                                top.material = topMat;
                                Room.updateRoom();
                            })
                            .catch((error) => {
                                console.error(
                                    `Error loading '${data.imagePath}':`,
                                    error
                                );
                            });
                    }
                })
                .catch((error) => {
                    console.error(
                        `Error fetching description for system ${id}:`,
                        error
                    );
                });
            Room.updateRoom();
        });
    }

    addUnit(unit: Unit, location = "space", relayout = true) {
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

        let loc = this.locations.get(location);
        if (loc) {
            loc.units.push(unit);
            if (relayout) this.layoutUnits();
        } else {
            this.locations.set(location, {
                id: 0,
                units: [unit],
            });
        }
    }

    removeUnit(unit: Unit, relayout = true)
    {
        this.locations.forEach((location) => {
            const idx = location.units.indexOf(unit);
            if (idx != -1) {
                unit.removeFromParent();
                location.units.splice(idx, 1);
                if (relayout) this.layoutUnits();
            }
        });
    }

    layoutUnits() {
        if (this.arranger)
        {
            this.locations.forEach((location) => {
                const layoutUnits = location.units.map(unit => { return { position: {x: unit.position.x, y: unit.position.z}, angle: 0, radius: 0.01 }});
                this.arranger?.arrange(location.id, layoutUnits);
                for (let i=0; i<layoutUnits.length; ++i)
                {
                    location.units[i].matrix.identity();
                    location.units[i].rotateY(layoutUnits[i].angle);
                    location.units[i].position.set(layoutUnits[i].position.x, 0, layoutUnits[i].position.y);
                }

            });
        }
    }

    onObjectSelected(event: MouseEvent, intersect: THREE.Intersection)
    {
        document.querySelector(
            "#system > #name"
        )!.innerHTML = `${this.description!.name} (${this.id})`;
        console.log(JSON.stringify(this.description, null, 2));
        document.querySelector(
            "#system > #location"
        )!.innerHTML = `X: ${this.tileId[0]}, Y: ${this.tileId[1]}`;
        /*
        document.querySelector(
            "#system > #description"
        ).innerHTML = `<br/><pre>${JSON.stringify(this.description, null, 2)}</pre>`;
        */
    }
}
