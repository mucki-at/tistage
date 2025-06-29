import * as THREE from "three";
import { Room } from "./room.mjs";
// @ts-expect-error
import { Unit } from "./units.mjs";
import * as utils from "./utils.mjs";
import * as layout from "./unitlayout.mts";

interface LocationData
{
    id: number,
    units: Unit[]
}

type Layout = layout.System & { sampler: layout.Sampler };

export class System extends THREE.Group {
    static #RepoURL =
        "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources";

    static #template = utils.gltf
        .loadAsync("system.glb")
        .then((result) => {
            const top = result.scene.getObjectByName("top");
            const sides = result.scene.getObjectByName("sides");

            const boundsObj = result.scene.getObjectByName("bounds");
            const bounds = {
                x: (boundsObj?.position.x ?? 0) * 1000,
                y: (boundsObj?.position.z ?? 0) * 1000,
                radius:
                    (parseFloat(boundsObj?.userData.radius) ?? 0.058) * 1000,
            };

            let types = new Map<string, Layout>();
            for (let i = 1; i <= 15; ++i) {
                const i2 = i.toString().padStart(2, "0");
                const i3 = i.toString().padStart(3, "0");

                let planets = [];
                for (let j = 0; j < 3; ++j) {
                    const p = result.scene.getObjectByName(`planet${j}${i3}`);
                    if (p) {
                        planets[j] = {
                            x: p.position.x * 1000,
                            y: -p.position.z * 1000,
                            radius: parseFloat(p.userData.radius) * 1000,
                        };
                    }
                }

                const l = layout.makeHexagonSystem(bounds, planets);
                const s = layout.makeRandomSampler(l);
                types.set(`TYPE${i2}`, { ...l, sampler: s });
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
    locations: Map<string, LocationData>;
    layout?: Layout;
    unitPlane?: THREE.Mesh;
    tileId: number[];

    debugCanvas: HTMLCanvasElement | null = null;

    constructor(id: number | string) {
        super();
        this.locations = new Map(); // map of location name -> layout id and units in that location
        this.locations.set("space", { id: 0, units: [] });
        this.tileId = [0, 0];

        System.#template.then((parts) => {
            const top = parts.top?.clone();
            const sides = parts.sides?.clone();
            if (top) this.add(top);
            if (sides) this.add(sides);

            System.getDescription(id)
                .then((data) => {
                    this.description = data;
                    this.layout = parts.types?.get(data.shipPositionsType);

                    data.planets.forEach((name: string, index: number) => {
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

                    if (top && "material" in top && "clone") {
                        utils
                            .loadTextureAsync(
                                `${System.#RepoURL}/tiles/${data.imagePath}`
                            )
                            .then((texture) => {
                                const topMat = (
                                    top.material as THREE.MeshStandardMaterial
                                ).clone();
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

    removeUnit(unit: Unit, relayout = true) {
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
        if (this.layout) {
            const layoutUnits: layout.Unit[][] = [];

            this.locations.forEach((location) => {
                layoutUnits[location.id] = 
                    location.units.map((unit) => {
                        return {
                            position: { x: 0, y: 0 },
                            angle: 0,
                            width: unit.width,
                            height: unit.length,
                        };
                    });
            });

            let ctx = null;
            if (this.debugCanvas) {
                ctx = this.debugCanvas.getContext("2d");
                ctx?.setTransform(
                    2,
                    0,
                    0,
                    -2,
                    this.debugCanvas.width / 2,
                    this.debugCanvas.height / 2
                );
                ctx?.clearRect(-60, -60, 120, 120);
            }
            if (ctx) {
                layout.drawSystem(ctx, this.layout);
                ctx.strokeStyle = "red";

                layout.randomizeLayoutUnits(
                    this.layout,
                    layoutUnits,
                    this.layout.sampler
                );
                layout.drawLayoutUnits(ctx, layoutUnits);
            }

            layout.solve(
                this.layout,
                layoutUnits,
                ctx ? undefined : this.layout.sampler
            );

            if (ctx) {
                layout.drawSystem(ctx, this.layout);
                ctx.strokeStyle = "green";
                layout.drawLayoutUnits(ctx, layoutUnits);
            }

            this.locations.forEach((location) => {
                layoutUnits[location.id].forEach((unit, i) => {
                    location.units[i].position.set(
                        unit.position.x / 1000,
                        location.units[i].height / 2000,
                        -unit.position.y / 1000
                    );
                    location.units[i].setRotationFromAxisAngle(THREE.Object3D.DEFAULT_UP, unit.angle);
                });
            });
        }
    }

    onObjectSelectionLost()
    {
        this.debugCanvas = null;
    }

    onObjectSelected() {
        document.querySelector("#system > #name")!.innerHTML = `${
            this.description!.name
        } (${this.id})`;
        console.log(JSON.stringify(this.description, null, 2));
        document.querySelector(
            "#system > #location"
        )!.innerHTML = `X: ${this.tileId[0]}, Y: ${this.tileId[1]}`;

        this.debugCanvas = document.querySelector("#system > #debug");
        /*
        document.querySelector(
            "#system > #description"
        ).innerHTML = `<br/><pre>${JSON.stringify(this.description, null, 2)}</pre>`;
        */
    }
}
