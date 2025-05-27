import * as THREE from "three";
import {Room} from "./room.mjs"
import {Table} from "./table.mjs"
import {System} from "./system.mjs"

var room=new Room()
room.init("old_room_4k.hdr",0.1,2);

var table = new Table(0.7, "wood_cabinet_worn_long_4k.gltf");
room.add(table);

var mecatol = new System();
table.add(mecatol);

