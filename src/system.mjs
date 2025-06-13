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
            console.error("Error loading System.glb:", reason);
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
        this.units = [];

        System.#template.then((parts) => {
            const top = parts.top.clone();
            this.add(top);
            this.add(parts.sides.clone());
            window.updateRoom();

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
    }

    addUnit(unit)
    {
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

        this.units.push(unit);
        this.unitPlane.add(unit);
        this.layoutUnits();
    }

    removeUnit(unit)
    {
        const idx=this.units.indexOf(unit);
        if (idx!=-1)
        {
            unit.removeFromParent();
            this.units.splice(idx,1);
        }
        this.layoutUnits();
    }

    layoutUnits()
    {
        if (this.units.length==1)
        {
            this.units[0].position.set(0,0,0);
            this.units[0].quaternion.identity();
            this.units[0].rotateY(THREE.MathUtils.randFloat(-Math.PI, Math.PI));
            this.units[0].rotateX(THREE.MathUtils.randFloat(-0.01, 0.01));
            this.units[0].rotateZ(THREE.MathUtils.randFloat(-0.01, 0.01));
        }
        else
        {
            const angle = (Math.PI * 2) / this.units.length;
            const radius = 0.025;

            for (let i = 0; i < this.units.length; i++)
            {
                this.units[i].position.set(radius * Math.cos(i*angle), 0, radius * Math.sin(i*angle));

                this.units[i].quaternion.identity();
                this.units[i].rotateY(
                    THREE.MathUtils.randFloat(-Math.PI, Math.PI)
                );
                this.units[i].rotateX(THREE.MathUtils.randFloat(-0.01, 0.01));
                this.units[i].rotateZ(THREE.MathUtils.randFloat(-0.01, 0.01));
            }
        }
    }
}
