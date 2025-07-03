import { Table } from "../table.mjs"
import { System } from "../system.mjs"
import { Unit } from "../units.mjs";
import { type GameState } from "../game.mts";
import * as utils from "../utils.mjs";
import * as pbd from "./types.mts";
import { assertEquals } from "typia";

export class Game implements GameState {
    static unitNames : Record<string,string> = {
        ca: "cruiser",
        cv: "carrier",
        dd: "destroyer",
        dn: "dreadnought",
        ff: "fighter",
        fs: "flagship",
        gf: "infantry",
        mf: "mech",
        pd: "pds",
        sd: "spacedock",
        ws: "warsun",
    };

    static gameUrl(name: string)
    {
        if (name.endsWith(".json")) return name;
        else return `https://ti4.westaddisonheavyindustries.com/webdata/${name}/${name}.json`;
    }

    name: string;
    state?: pbd.PlayerDataResponse;

    constructor(name: string) {
        this.name = name;
    }

    reloadAsync() : Promise<GameState>
    {
        return utils
            .loadJsonAsync(Game.gameUrl(this.name))
            .then((data) => {
                this.state = assertEquals<pbd.PlayerDataResponse>(data);
                if (this.state.versionSchema!=4)
                {
                    console.warn(
                        `AsyncTI4 game ${this.name} is using schema version ${this.state.versionSchema}. We expected version 4 but the JSON structure conforms to our expectations so we are going to proceed.`
                    );
                }
                return this;
            })
            .catch((error) => {
                console.error(`Error loading AsyncTI4 game ${this.name}:`, error);
                return this;
            });
    }

    setupTable(table:Table)
    {
        table.clearSystems();

        if (!this.state)
        {
            return;    
        }

        var factionColors : Record<string,string> = {
            neutral: "white",
        };
        this.state.playerData.forEach((player) => {
            factionColors[player.faction] = player.color;
        });

        for (let element of this.state.tilePositions) {
            let positionStr, id, tileId;
            [positionStr, id] = element.split(":");

            const position = parseInt(positionStr);
            if (!isNaN(position)) {
                tileId = Table.TileIdFromRingAndSlot(
                    Math.floor(position / 100),
                    position % 100
                );
            } else if (positionStr == "tl") {
                tileId = [-2, 5];
            } else if (positionStr == "tr") {
                tileId = [2, 3];
            }
            if (!tileId) continue;
            var system = new System(id);
            table.setSystem(tileId, system);

            const data = this.state.tileUnitData[positionStr];
            if (data) {
                for (const [faction, units] of Object.entries(data.space)) {
                    const color = factionColors[faction];
                    units.forEach((unitDef) => {
                        if (unitDef.entityType == "unit") {
                            for (let i = 0; i < unitDef.count; ++i)
                            {
                                if (unitDef.entityId in Game.unitNames)
                                {
                                    const unit = new Unit(
                                        Game.unitNames[unitDef.entityId]
                                    );
                                    if (unitDef.sustained) unit.sustained = true;
                                    unit.setColor(color);
                                    system.addUnit(unit, "space");
                                }
                            }
                        }
                    });
                }
                for (const [name, planet] of Object.entries(data.planets)) {
                    for (const [faction, units] of Object.entries(
                        planet.entities
                    )) {
                        const color = factionColors[faction];
                        units.forEach((unitDef) => {
                            if (unitDef.entityType == "unit") {
                                for (let i = 0; i < unitDef.count; ++i) {
                                    const unit = new Unit(
                                        Game.unitNames[unitDef.entityId]
                                    );
                                    if (unitDef.sustained)
                                        unit.sustained = true;
                                    unit.setColor(color);
                                    system.addUnit(unit, name);
                                }
                            }
                        });
                    }
                }
            }
        }
    }
}
