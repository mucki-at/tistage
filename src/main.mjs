import * as THREE from "three";
import {Room} from "./room.mjs"
import {Table} from "./table.mjs"
import {System} from "./system.mjs"

var room=new Room()
room.init("old_room_4k.hdr",0.1,2).then(window.updateRoom);

var table = new Table(0.7, "wood_cabinet_worn_long_4k.gltf");
room.add(table);

table.setSystem([0,0], new System(18)); // 18 is mecatol rex

var sys=1;
for (var ring=1; ring<=5; ++ring)
{
    for (var slot=1; slot<=ring*6; ++slot)
    {
        const tileId=Table.TileIdFromRingAndSlot(ring, slot);
        table.setSystem(tileId, new System(sys));
        ++sys;
    }
}
