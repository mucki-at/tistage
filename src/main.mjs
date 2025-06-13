import * as THREE from "three";
import {Room} from "./room.mjs"
import {Table} from "./table.mjs"
import {System} from "./system.mjs"
import { Unit } from "./units.mjs";

var room=new Room()
room.init("old_room",0.1,2).then(window.updateRoom);

var table = new Table(0.7, "wood_cabinet_worn_long_4k.gltf");
room.add(table);

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
