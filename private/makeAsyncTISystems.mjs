import fs from "node:fs";

const outname = process.argv[2];
if (!outname)
{
    console.log(`Usage: node makeAsyncTISystems.js <outputfile>`);
    process.exit(-1);
}

function loadPbdData(url)
{
    return fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to download ${url}: ${response.status}`);
            }

            return response.text().then((content) => {
                const re = /^[\s\S]*?export[^=]+=(?<data>[\s\S]+)$/;
                const result = re.exec(content);
                if (result == null) {
                    throw new Error(`Failed to extract data from ${url}`);
                }

                const data = eval(result.groups["data"]);
                return data;
            });
        });    
}

// build name map
const systems =
{
    modelUrl: "pbd/system.glb",
    imageUrl: "https://raw.githubusercontent.com/AsyncTI4/TI4_map_generator_bot/refs/heads/master/src/main/resources/tiles/",
    definitions: {}
};

// solid colors
console.log("Fetching system definitions...");
const pbdSystems = await loadPbdData(
    "https://raw.githubusercontent.com/AsyncTI4/ti4_web_new/refs/heads/main/src/data/systems.ts"
);

console.log("Building system definitions...");
for (let def of pbdSystems) {
    const system = {
        name: def.name ?? def.id,
        planets: def.planets ?? [],
        type: def.shipPositionsType ?? 'TYPE08',
        image: def.imagePath ?? '00_blue.png',
    };
    systems.definitions[def.id]=system;
}


console.log(`Writing ${Object.keys(systems.definitions).length} systems to ${outname}`);
var json = JSON.stringify(systems);
fs.writeFileSync(outname, json, "utf8");
process.exit(0);

