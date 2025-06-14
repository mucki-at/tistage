import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import {Room} from "./room.mjs"
import {Table} from "./table.mjs"
import { System } from "./system.mjs";
import {Game} from "./game.mjs";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const room=new Room()
room.init("old_room",0.1,2).then(window.updateRoom);

const table = new Table(0.7, "wood_cabinet_worn_long_4k.gltf");
room.add(table);

const game = new Game(table);

let gameSettings = {
    id: urlParams.get("id") ?? "",
    reload: function () {
        var url = "pbd.json";
        if (gameSettings.id != "") {
            url = `https://ti4.westaddisonheavyindustries.com/webdata/${gameSettings.id}/${gameSettings.id}.json`;
        }
        game.reload(url);
    },
};

const panel = new GUI({ width: 310 });
const folder1 = panel.addFolder("Game");
folder1.add(gameSettings, "id");
folder1.add(gameSettings, "reload");

gameSettings.reload();
			
/*
table.setSystem(Table.TileIdFromRingAndSlot(0, 0), new System(18));
table.setSystem(Table.TileIdFromRingAndSlot(1, 1), new System(19));
table.setSystem(Table.TileIdFromRingAndSlot(2, 1), new System(20));
table.setSystem(Table.TileIdFromRingAndSlot(3, 1), new System(21));
*/

/*
var mr = new System(18);  // 18 is mecatol rex
mr.addUnit(new Unit("fighter"));
mr.addUnit(new Unit("cruiser"));
mr.addUnit(new Unit("destroyer"));
table.setSystem([0,0], mr);

var sys=1;
for (var ring=1; ring<=4; ++ring)
{
    for (var slot=1; slot<=ring*6; ++slot)
    {
        const tileId=Table.TileIdFromRingAndSlot(ring, slot);
        table.setSystem(tileId, new System(sys));
        ++sys;
    }
}
*/