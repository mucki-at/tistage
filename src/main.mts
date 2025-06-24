import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Room } from "./room.mts"
import { Table } from "./table.mts"
import { Game } from "./game.mjs";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const room=new Room()
room.init("old_room",0.1,2).then(Room.updateRoom);

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
    relayout: function () {
        table.relayout();
        Room.updateRoom();
    },
};

const panel = new GUI({ width: 310 });
const folder1 = panel.addFolder("Game");
folder1.add(gameSettings, "id");
folder1.add(gameSettings, "reload");
const folder2 = panel.addFolder("Units");
folder2.add(gameSettings, "relayout");

gameSettings.reload();

