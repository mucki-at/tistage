import { Table } from "./table.mjs"
import { System } from "./system.mjs"
import { Unit } from "./units.mjs";
import * as utils from "./utils.mjs";

export class Game {
    static unitNames = {
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
        ws: "warsun"
    };

    constructor(table) {
        this.table = table;
        this.state = null;
    }

    reload(url) {
        utils
            .loadJsonAsync(url)
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
        for (let element of this.state.tilePositions) {
            let positionStr, id, tileId;
            [positionStr, id] = element.split(":");

            const position = parseInt(positionStr);
            if (!isNaN(position)) {
                tileId = Table.TileIdFromRingAndSlot(
                    Math.floor(position / 100),
                    position % 100
                );
            }
            else if (positionStr=="tl")
            {
                tileId = [ -2, 5];
            }
            else if (positionStr=="tr")
            {
                tileId = [ 2, 3];
            }
            else
            {
                continue;
            }
            var system = new System(id);
            this.table.setSystem(tileId, system);

            const data = this.state.tileUnitData[positionStr];
            if (data) {
                for (const [faction, units] of Object.entries(data.space)) {
                    const color = factionColors[faction];
                    units.forEach((unitDef) => {
                        if (unitDef.entityType == "unit")
                        {
                            for (let i=0; i<unitDef.count; ++i)
                            {
                                const unit = new Unit(
                                    Game.unitNames[unitDef.entityId]
                                );
                                if (unitDef.sustained) unit.sustained = true;
                                unit.setColor(color);
                                system.addUnit(unit, "space");
                            }
                        }
                    });
                }
                for (const [name, planet] of Object.entries(data.planets))
                {
                    for (const [faction, units] of Object.entries(planet.entities))
                    {
                        const color = factionColors[faction];
                        units.forEach((unitDef) => {
                            if (unitDef.entityType == "unit") {
                                for (let i=0; i<unitDef.count; ++i)
                                {
                                    const unit = new Unit(
                                        Game.unitNames[unitDef.entityId]
                                    );
                                    if (unitDef.sustained) unit.sustained=true;
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
