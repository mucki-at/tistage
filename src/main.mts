import { GUI } from "three/addons/libs/lil-gui.module.min.js"
import { Room } from "./room.mts"
import { Table } from "./table.mts"
import { loadPbdGameStateAsync } from "./game.mts";
import { Unit } from "./units.mts";
import { Token } from "./tokens.mts";
import { LoadTemplateDefinitionsAsync } from "./template.mts";

import "./main.css"

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const room=new Room()
room.init("old_room",0.1,2).then(Room.updateRoom);

const table = new Table(0.7, "wood_cabinet_worn_long_4k.gltf");
room.add(table);

LoadTemplateDefinitionsAsync("units.json").then((defs) =>
{
    const unitDefs = defs;
    const unitOptions = Object.getOwnPropertyNames(unitDefs.definitions);

    function updateModels(name: string) {
        const def = unitDefs.definitions[name];
        if (def) {
            Unit.models.LoadTemplate(def.url);
            Unit.models.oneshot({}, relayout);
    
            document.querySelector(
                "#info > #modelDesc"
            )!.innerHTML = `${def.description} (&copy; ${def.copyright})`;
        }
    }
    
    function relayout() {
        table.relayout();
        Room.updateRoom();
    }

    function reload()
    {
        var name = "pbd.json";
        if (gameSettings.id != "") {
            name = gameSettings.id;
        }
        loadPbdGameStateAsync(name).then((game) => game.setupTable(table));
    }
    
    let gameSettings = {
        id: urlParams.get("id") ?? "",
        reload: reload,
        models: unitDefs.default,
        relayout: relayout
    };
    
    const panel = new GUI({ width: 310 });
    const folder1 = panel.addFolder("Game");
    folder1.add(gameSettings, "id").name("AsyncTI name").onFinishChange(reload);
    folder1.add(gameSettings, "reload");
    const folder2 = panel.addFolder("Units");
    folder2.add(gameSettings, "models", unitOptions).onFinishChange(updateModels);
    folder2.add(gameSettings, "relayout");
    
    updateModels(unitDefs.default);
    gameSettings.reload();
});

Token.models.LoadTemplate("tokens.glb");
Unit.colors.LoadTemplate("colors.glb");



