import * as THREE from "three";
import {Room} from "./room.mjs"
import {Table} from "./table.mjs"
import {System} from "./system.mjs"

var room=new Room()
room.init("old_room_4k.hdr",0.1,2);

var table = new Table(0.7, "wood_cabinet_worn_long_4k.gltf");
room.add(table);

var mecatol = new System(
  "https://cdn.statically.io/gh/AsyncTI4/TI4_map_generator_bot/master/src/main/resources/tiles/18_MR.png?raw=true"
);
table.add(mecatol);

var mecatol2 = new System(
  "https://cdn.statically.io/gh/AsyncTI4/TI4_map_generator_bot/master/src/main/resources/tiles/18_MR.png?raw=true"
);
mecatol2.position.x=0.5
table.add(mecatol2);
  