import * as THREE from "three";
import * as utils from "./utils.mts";
import { TemplateLoader, TemplateCache } from "./template.mts";

class TokenLoader extends TemplateLoader<THREE.Mesh>
{
    handleLoadTemplateAsync(url: string)
    {
        return utils.gltf
        .loadAsync(url)
        .then((result) => {
            const template = new Map<string, THREE.Mesh>();
            result.scene.children.forEach((obj) => {
                if (obj instanceof THREE.Mesh)
                {
                    template.set(obj.userData.name.split(".")[0], obj);
                }

            });
            return template;
        })
    }

    handleUpdateComplete() : void
    {
    }
}

export class Token extends THREE.Mesh {
    static models = new TokenLoader();

    width = 0;
    height = 0;
    length = 0;

    constructor(id: string) {
        super();
        this.name = id;

        Token.models.addConsumer(this, this.onModelUpdated);
    }

    dispose() {
        Token.models.removeConsumer(this);
    }

    onObjectSelected(_event: MouseEvent, _intersect: THREE.Intersection) {
        document.querySelector("#token > #name")!.innerHTML = this.name;
    }

    onModelUpdated(template: Map<string, THREE.Mesh>): void {
        const source = template.get(this.name);
        if (!source) {
            return
        }

        if (this.geometry != source.geometry) {
            this.geometry = source.geometry;
            this.material = source.material;

            if (this.geometry.boundingBox) {
                this.width =
                    (this.geometry.boundingBox.max.x -
                        this.geometry.boundingBox.min.x) *
                    1000;
                this.height =
                    (this.geometry.boundingBox.max.y -
                        this.geometry.boundingBox.min.y) *
                    1000;
                this.length =
                    (this.geometry.boundingBox.max.z -
                        this.geometry.boundingBox.min.z) *
                    1000;

                // if unit is nearly a box, assume it is a circle.
                if (Math.abs(this.width - this.length) < 1) {
                    this.width /= 2;
                    this.length = 0;
                }
            } else {
                this.width = 0;
                this.height = 0;
                this.length = 0;
            }
        }
    }
}

class FactionCache extends TemplateCache<THREE.Texture> {
    static #RepoURL =
        "https://raw.githubusercontent.com/TI4-Online/TI4-TTPG/refs/heads/main/assets/Textures/global/tokens";

    static #PokFactions = ["argent", "empyrian", "mahact", "nazrokha", "nomad", "titans", "vuilraith"];

    handleLoadAsync(name: string): Promise<THREE.Texture>
    {
        let source="base";
        if (FactionCache.#PokFactions.includes(name)) source="pok";
        if (name=="keleres") source="codex/vigil"

        return utils.loadTextureAsync(
            `${FactionCache.#RepoURL}/${source}/faction/${name}.png`
        ).then((texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            return texture;
        });
    }
}

export class FactionToken extends Token
{
    static factions = new FactionCache();
    faction: string;

    constructor(id: string, faction: string) {
        super(id);
        this.faction = faction;

        Token.models.addConsumer(this, this.onModelUpdated);
        this.setFactionTexture();
    }

    dispose() {
        Token.models.removeConsumer(this);
    }

    onObjectSelected(_event: MouseEvent, _intersect: THREE.Intersection) {
        document.querySelector(
            "#token > #name"
        )!.innerHTML = `${this.name} (${this.faction})`;
    }

    onModelUpdated(template: Map<string, THREE.Mesh>): void {
        const source = template.get(this.name);
        if (!source) {
            return;
        }

        if (this.geometry != source.geometry) {
            this.geometry = source.geometry;
            this.material = source.material;
            this.setFactionTexture();

            if (this.geometry.boundingBox) {
                this.width =
                    (this.geometry.boundingBox.max.x -
                        this.geometry.boundingBox.min.x) *
                    1000;
                this.height =
                    (this.geometry.boundingBox.max.y -
                        this.geometry.boundingBox.min.y) *
                    1000;
                this.length =
                    (this.geometry.boundingBox.max.z -
                        this.geometry.boundingBox.min.z) *
                    1000;

                // if unit is nearly a box, assume it is a circle.
                if (Math.abs(this.width - this.length) < 1) {
                    this.width /= 2;
                    this.length = 0;
                }
            } else {
                this.width = 0;
                this.height = 0;
                this.length = 0;
            }
        }
    }

    setFactionTexture()
    {
        FactionToken.factions
            .Get(this.faction)
            .then((texture) => {
                if ((this.material) && (!Array.isArray(this.material)) && ("map" in this.material))
                {
                    const newMat = this.material.clone();
                    newMat.map = texture;
                    this.material=newMat;
                }
            });

    }
}

