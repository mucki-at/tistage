import {Table} from "./table.mjs"
import {System} from "./system.mjs"
import {Unit} from "./units.mjs";
import * as utils from "./utils.mjs";

export class Game {
    static unitNames = {
        ca: "cruiser",
        cv: "carrier",
        dd: "destroyer",
        dn: "dreadnaught",
        ff: "fighter",
        fs: "flagship",
        gf: "infantry",
        mf: "mech",
        pd: "pds",
        sd: "spacedock",
        ws: "warsun"
    };
    constructor(table) {
        this.table = table;
        this.state = null;
    }

    reload(url) {
        utils
            .LoadJsonAsync(url)
            .then((data) => {
                this.state = data;
                this.#setupTable();
            })
            .catch((error) => {
                console.error("Error loading JSON:", error);
            });
    }

    #setupTable() {
        var factionColors = {
            neutral: "white",
        };
        this.state.playerData.forEach((player) => {
            factionColors[player.faction] = player.color;
        });

        this.table.clearSystems();
        this.state.tilePositions.forEach((element) => {
            let positionStr, id;
            [positionStr, id] = element.split(":");
            const position = parseInt(positionStr);
            if (!isNaN(position)) {
                const tileId = Table.TileIdFromRingAndSlot(
                    Math.floor(position / 100),
                    position % 100
                );
                var system = new System(id);
                this.table.setSystem(tileId, system);

                const data = this.state.tileUnitData[positionStr];
                if (data) {
                    for (const [faction, units] of Object.entries(data.space)) {
                        const color = factionColors[faction];
                        units.forEach((unitDef) => {
                            if (unitDef.entityType == "unit")
                            {
                                const unit = new Unit(
                                    Game.unitNames[unitDef.entityId]
                                );
                                unit.setColor(color);
                                system.addUnit(unit);
                            }
                        });
                    }
                }
            }
        });
    }
}
