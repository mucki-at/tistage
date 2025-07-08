import * as THREE from "three";
import { Room } from "./room.mts";
import { Unit } from "./units.mts";
import { Token } from "./tokens.mts";
import * as utils from "./utils.mts";
import * as layout from "./unitlayout.mts";
import { TemplateLoader, TemplateCache } from "./template.mts";
import { assertEquals } from "typia";

interface LocationData
{
    id: number;
    items: (Unit | Token)[];
}

type Layout = layout.System & { sampler: layout.Sampler };

interface SystemDefinition {
    name: string;
    planets: string[];
    type: string;
    image: string;
}

interface SystemDefinitions {
    modelUrl: string;
    imageUrl: string;
    definitions: Record<string,SystemDefinition>;
}

interface Template {
    top?: THREE.Object3D;
    sides?: THREE.Object3D;
    types?: Map<string, Layout>;
}

class TextureCache extends TemplateCache<THREE.Texture> {
    baseUrl: string = "";
    handleLoadAsync(name: string): Promise<THREE.Texture> {
        return utils.loadTextureAsync(this.baseUrl + name);
    }
};

export class SystemLoader extends TemplateLoader<SystemDefinition>
{
    template: Promise<Template> = utils.makePromise({top:undefined, sides:undefined, types:undefined});
    textures: TextureCache = new TextureCache();

    handleLoadTemplateAsync(url: string) {
        return utils.loadJsonAsync(url).then((json) =>
        {
            const systems = assertEquals<SystemDefinitions>(json);
            this.textures.baseUrl = systems.imageUrl;
            this.textures.Clear();

            this.template=utils.gltf
                .loadAsync(systems.modelUrl)
                .then((result) => {
                    const top = result.scene.getObjectByName("top");
                    const sides = result.scene.getObjectByName("sides");

                    const boundsObj = result.scene.getObjectByName("bounds");
                    const bounds = {
                        x: (boundsObj?.position.x ?? 0) * 1000,
                        y: (boundsObj?.position.z ?? 0) * 1000,
                        radius:
                            (parseFloat(boundsObj?.userData.radius) ?? 0.058) *
                            1000,
                    };

                    let types = new Map<string, Layout>();
                    for (let i = 1; i <= 15; ++i) {
                        const i2 = i.toString().padStart(2, "0");
                        const i3 = i.toString().padStart(3, "0");

                        let planets = [];
                        for (let j = 0; j < 3; ++j) {
                            const p = result.scene.getObjectByName(
                                `planet${j}${i3}`
                            );
                            if (p) {
                                planets[j] = {
                                    x: p.position.x * 1000,
                                    y: -p.position.z * 1000,
                                    radius:
                                        parseFloat(p.userData.radius) * 1000,
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
                    return {
                        top: undefined,
                        sides: undefined,
                        types: undefined,
                    };
                });
            
            return new Map<string,SystemDefinition>(Object.entries(systems.definitions));
        });
    }

    handleUpdateComplete(): void {
        Room.updateRoom();
    }
}



export class System extends THREE.Group
{
    static template = new SystemLoader();

    systemId: string;
    locations: Map<string, LocationData>;
    layout?: Layout;
    unitPlane?: THREE.Mesh;
    top?: THREE.Mesh;
    sides?: THREE.Mesh;
    tileId: number[];

    debugCanvas: HTMLCanvasElement | null = null;

    constructor(id: number | string) {
        super();
        this.systemId = id.toString();
        this.locations = new Map(); // map of location name -> layout id and units in that location
        this.locations.set("space", { id: 0, items: [] });
        this.tileId = [0, 0];

        System.template.addConsumer(this, this.onDefinitionUpdated);
    }

    onDefinitionUpdated(definitions : Map<string,SystemDefinition>)
    {
        const def=definitions.get(this.systemId);
        if (!def)
        {
            return;
        }

        this.name=def.name;
        const model=System.template.template;
        const texture=System.template.textures.Get(def.image);
        Promise.all([model, texture]).then(([parts, texture]) =>
        {
            const top = parts.top?.clone();
            const sides = parts.sides?.clone();
            if (top) this.add(top);
            if (sides) this.add(sides);

            this.layout = parts.types?.get(def.type);
            def.planets.forEach((name: string, index: number) => {
                let loc = this.locations.get(name);
                if (loc) {
                    loc.id = index + 1;
                } else {
                    this.locations.set(name, {
                        id: index + 1,
                        items: [],
                    });
                }
            });
            this.layoutItems();

            if (top && "material" in top && top.material instanceof THREE.Material)
            {
                top.material = utils.replaceColorInformation(top.material, undefined, texture, true);
            }
            Room.updateRoom();
        });
    }

    addItem(item: Unit | Token, location = "space", relayout = true) {
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

        this.unitPlane.add(item);

        let loc = this.locations.get(location);
        if (loc) {
            loc.items.push(item);
            if (relayout) this.layoutItems();
        } else {
            this.locations.set(location, {
                id: 0,
                items: [item],
            });
        }
    }

    removeItem(item: Unit | Token, relayout = true) {
        this.locations.forEach((location) => {
            const idx = location.items.indexOf(item);
            if (idx != -1) {
                item.removeFromParent();
                location.items.splice(idx, 1);
                if (relayout) this.layoutItems();
            }
        });
    }

    layoutItems() {
        if (this.layout) {
            const layoutItems: layout.Unit[][] = [];

            this.locations.forEach((location) => {
                layoutItems[location.id] = location.items.map((item) => {
                    return {
                        position: { x: 0, y: 0 },
                        angle: 0,
                        width: item.width,
                        height: item.length,
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
                    layoutItems,
                    this.layout.sampler
                );
                layout.drawLayoutUnits(ctx, layoutItems);
            }

            layout.solve(
                this.layout,
                layoutItems,
                ctx ? undefined : this.layout.sampler
            );

            if (ctx) {
                layout.drawSystem(ctx, this.layout);
                ctx.strokeStyle = "green";
                layout.drawLayoutUnits(ctx, layoutItems);
            }

            this.locations.forEach((location) => {
                layoutItems[location.id].forEach((unit, i) => {
                    location.items[i].position.set(
                        unit.position.x / 1000,
                        location.items[i].height / 2000,
                        -unit.position.y / 1000
                    );
                    location.items[i].setRotationFromAxisAngle(
                        THREE.Object3D.DEFAULT_UP,
                        unit.angle
                    );
                    if ("sustained" in location.items[i])
                    {
                        if (location.items[i].sustained) {
                            location.items[i].rotateZ(
                                Math.PI +
                                    THREE.MathUtils.randFloatSpread(Math.PI / 6)
                            );
                        }
                    }
                });
            });
        }
    }

    onObjectSelectionLost() {
        this.debugCanvas = null;
    }

    onObjectSelected() {
        document.querySelector("#system > #name")!.innerHTML = `${
            this.name
        } (${this.id})`;
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
