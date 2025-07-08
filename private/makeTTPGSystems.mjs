import fs from "node:fs";

const outname = process.argv[2];
if (!outname)
{
    console.log(`Usage: node makeTTPGSystems.js <outputfile>`);
    process.exit(-1);
}

function loadJson(url) {
    return fetch(url).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to download ${url}: ${response.status}`);
        }
        return response.json(); // Parse the JSON from the response
    });
}

function loadLocalJson(filename)
{
    return JSON.parse(fs.readFileSync(filename, {encoding:'utf8'}));
}

function loadTtpgData(url) {
    return fetch(url).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to download ${url}: ${response.status}`);
        }

        return response.text().then((content) => {
            const re = /^[\s\S]*?module.exports =(?<data>[\s\S]+)$/;
            const result = re.exec(content);
            if (result == null) {
                throw new Error(`Failed to extract data from ${url}`);
            }

            const data = eval(result.groups["data"]);
            return data;
        });
    });
}

const locale = await loadJson(
    "https://raw.githubusercontent.com/TI4-Online/TI4-TTPG/refs/heads/main/lang/en.json"
);


// build name map
const systems = {
    modelUrl: "pbd/system.glb",
    imageUrl:
        "https://raw.githubusercontent.com/TI4-Online/TI4-TTPG/refs/heads/main/assets/Textures/",
    definitions: {},
};

// pbd data for types
const pbdSystems = loadLocalJson("public/pbd/systems.json");

console.log("Fetching system definitions...");
const ttpgSystems = await loadTtpgData(
    "https://raw.githubusercontent.com/TI4-Online/TI4-TTPG/refs/heads/main/src/lib/system/system.data.js"
);

console.log("Building system definitions...");
for (let def of ttpgSystems)
{
    const name = def.tile.toString().padStart(2, "0");
    const pbdDef = pbdSystems.definitions[name];
    const system = {
        name: pbdDef?.name ?? name,
        planets: def.planets?.map((pd) => locale[pd.localeName]) ?? [],
        type: pbdDef?.type ?? "TYPE08",
        image: def.img ?? "locale/ui/tiles/base/hazard/tile_046.png",
    };
    system.image = system.image.replace(/^locale/, "en");
    systems.definitions[name] = system;
}


console.log(`Writing ${Object.keys(systems.definitions).length} systems to ${outname}`);
var json = JSON.stringify(systems);
fs.writeFileSync(outname, json, "utf8");
process.exit(0);

