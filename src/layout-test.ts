import { GUI } from "dat.gui";
import * as THREE from "three";
import * as unitlayout from "./unitlayout.mts"
import * as mj from "matter-js";

const drawingboard = document.getElementById("drawingboard")!;
const canvas: HTMLCanvasElement = document.createElement("canvas")!;
canvas.width = 1001;
canvas.height = 1001;
canvas.style.backgroundColor = 'lightgray';
drawingboard.appendChild(canvas);
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;


let mouseClick : Function | null = null;

function handleMouseClick(event : MouseEvent)
{
    if (mouseClick)
    {
        mouseClick(event.offsetX, event.offsetY);
    }
}

canvas.addEventListener('mousedown', handleMouseClick, { passive: true });

const test:any =
{
    fill: 50.0,
    units: 10,
    width: 10,
    height: 30,
    circles: 0.3,
    spread: 0.1
}

const matterOpts : mj.IBodyDefinition = 
{
    friction: 0.1,
    frictionAir: 0.1,
    frictionStatic: 1,
    restitution: 0,
}

const gui = new GUI({ width: 310 });
let f = gui.addFolder("test");
f.add(test, 'fill', 0, 100, 1);
f.add(test, "units", 1, 100, 1);
f.add(test, "width", 1, 100, 10);
f.add(test, "height", 1, 100, 10);
f.add(test, "circles", 0, 1, 0.1);
f.add(test, "spread", 0, 1, 0.1);
f.open();
f = gui.addFolder("matter.js");
f.add(matterOpts, "friction", 0, 1, 0.01);
f.add(matterOpts, "frictionAir", 0, 1, 0.01);
f.add(matterOpts, "frictionStatic", 0, 10, 0.1);
f.add(matterOpts, "restitution", 0, 1, 0.01);
f.open();


function addTest(name: string, fun: Function)
{
    test[name] = () => { stopMJ(); mouseClick=null; fun(); };
    gui.add(test, name);
}

//// create our spawning area
const radius = 58;
const planetRadius = 19;
const planetPos = 30;

const planets = [
    { x: planetPos, y: 0, radius: planetRadius },
    {
        x: -0.5 * planetPos, y: -0.866 * planetPos,
        radius: planetRadius,
    },
    {
        x: -0.5 * planetPos, y: 0.866 * planetPos,
        radius: planetRadius,
    },
];

const layout = unitlayout.makeHexagonSystem(
    { x: 0, y: 0, radius: radius },
    planets
);
const sampler = unitlayout.makeRandomSampler(layout);

//// helpers to draw shape geometries on canvas

function randFloat(min:number, max:number)
{
    return min + Math.random() * (max-min);
}

function makeRandomUnits(count: number, sampler:unitlayout.Sampler, region:number, angleMin:number=0, angleMax:number=Math.PI*2) : unitlayout.Unit[]
{
    const result:unitlayout.Unit[] = [];

    for (let i = 0; i < count; ++i) {
        result.push({
            position: sampler.sample(region),
            angle: randFloat(angleMin, angleMax),
            width: randFloat(
                test.width * (1 - test.spread),
                test.width * (1 + test.spread)
            ),
            height:
                Math.random() <= test.circles
                    ? 0
                    : randFloat(
                          test.height * (1 - test.spread),
                          test.height * (1 - test.spread)
                      ),
        });
    }
    return result;
}

function makeRandomLayoutUnits(): unitlayout.Unit[][]
{
    const result = [
        makeRandomUnits(test.units, sampler, 0),
        makeRandomUnits(Math.floor(randFloat(0, test.units / 4)), sampler, 1),
        makeRandomUnits(Math.floor(randFloat(0, test.units / 4)), sampler, 2),
        makeRandomUnits(Math.floor(randFloat(0, test.units / 4)), sampler, 3),
    ];
    return result;
}

//// matter-js tests


// create an engine
const mjEngine = mj.Engine.create({enableSleeping: true});

// create a renderer
const mjRender = mj.Render.create({
    canvas: canvas,
    engine: mjEngine,
    options: {
        hasBounds: false,
        pixelRatio: 1,
        width: 1001,
        height: 1001,
        showSleeping: true,
        background: "lightgray",
        wireframeBackground: "lightgray",
        //@ts-expect-error  // the types file is missing this property
        wireframeStrokeStyle: "black"
    },
});

// create runner
var mjRunner = mj.Runner.create();

function stopMJ()
{
    mj.Render.stop(mjRender);
    mj.Runner.stop(mjRunner);
    mj.Composite.clear(mjEngine.world,false,true);
    mjEngine.world.gravity.scale = 0;

    ctx.setTransform(5, 0, 0, -5, 500, 500);
    ctx.lineWidth = 0.1;
    ctx.clearRect(-500, -500, 1001, 1001);
}

stopMJ();

function startMJ()
{
    // run the renderer
    mj.Render.lookAt(mjRender, mj.Composite.allBodies(mjEngine.world));
    mj.Render.run(mjRender);
    // run the engine
    mj.Runner.run(mjRunner, mjEngine);
}

addTest("mjSimple", ()=>{
    mjEngine.world.gravity.scale = 0.01;

    // create two boxes and a ground
    var boxA = mj.Bodies.rectangle(0, -100, 80, 80);
    var boxB = mj.Bodies.rectangle(0, -200, 80, 80);
    var ground = mj.Bodies.rectangle(0, 0, 100, 60, {
        ...matterOpts,
        isStatic: true,
    });

    mj.Composite.add(mjEngine.world, [boxA, boxB, ground]);

    startMJ();
});

addTest("mjPackRectangles", ()=>{
    // create a box to fill
    let box = [
        mj.Bodies.rectangle(0, -55, 120, 10, { ...matterOpts, isStatic: true }),
        mj.Bodies.rectangle(0, 55, 120, 10, { ...matterOpts, isStatic: true }),
        mj.Bodies.rectangle(-55, 0, 10, 120, { ...matterOpts, isStatic: true }),
        mj.Bodies.rectangle(55, 0, 10, 120, { ...matterOpts, isStatic: true }),
    ];

    // add all of the bodies to the world
    mj.Composite.add(mjEngine.world, box);

    startMJ();

    mouseClick = (x: number, y: number) => {
        console.log(`x: ${x}, y: ${y}`);
        mj.Composite.add(
            mjEngine.world,
            mj.Bodies.rectangle((x-500)/10, (y-500)/10, test.width, test.height, {
                ...matterOpts,
                angle: Math.random() * Math.PI * 2,
                restitution: 0.2,
            })
        );
        mj.Composite.allBodies(mjEngine.world).forEach((body) =>
            mj.Sleeping.set(body, false)
        );
    };
});


addTest("mjConstraintsPacker", () => {
    // create a box to fill
    let box = [
        mj.Bodies.rectangle(0, -55, 120, 10, { ...matterOpts, isStatic: true }),
        mj.Bodies.rectangle(0, 55, 120, 10, { ...matterOpts, isStatic: true }),
        mj.Bodies.rectangle(-55, 0, 10, 120, { ...matterOpts, isStatic: true }),
        mj.Bodies.rectangle( 55, 0, 10, 120, { ...matterOpts, isStatic: true }),
    ];

    // add all of the bodies to the world
    mj.Composite.add(mjEngine.world, box);

    // create some items
    for (let i = 0; i < test.units; ++i) {
        let body = mj.Bodies.circle(Math.random()*100-50, Math.random()*100-50, test.width,
        {
            ...matterOpts,
            angle: Math.random() * 2 * Math.PI
        });
        let constraint = mj.Constraint.create({
            bodyA: body,
            pointA: { x: 0, y: 0 },
            pointB: { x: 0, y: 0 },
            length: 0,
            damping: 0,
            stiffness: 0.002
        });
        mj.Composite.add(mjEngine.world, [body, constraint]);
    }

    startMJ();

});

function mjLineToBounds(
    a: unitlayout.PointLike,
    b: unitlayout.PointLike,
    options: mj.IBodyDefinition
) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const overshoot = 0.2;
    const thickness = 0.5;

    const tr = { x: b.x + dx * overshoot, y: b.y + dy * overshoot };
    const br = { x: a.x - dx * overshoot, y: a.y - dy * overshoot };
    const tl = { x: tr.x + dy * thickness, y: tr.y - dx * thickness };
    const bl = { x: br.x + dy * thickness, y: br.y - dx * thickness };

    const cx = (tr.x + bl.x) / 2;
    const cy = (tr.y + bl.y) / 2;

    return mj.Bodies.fromVertices(cx, cy, [[tr, br, bl, tl]], {
        ...options,
        isStatic: true,
    });
};

function mjUnitToBody(unit:unitlayout.Unit)
{
    if ((unit.height) && (unit.height>0))
    {
        return mj.Bodies.rectangle(
            unit.position.x,
            unit.position.y,
            unit.width,
            unit.height,
            { ...matterOpts, angle: unit.angle }
        );
    }
    else
    {
        return mj.Bodies.circle(unit.position.x, unit.position.y, unit.width, {
            ...matterOpts,
            angle: unit.angle,
        });
    }
}

addTest("mjArrangeLive", () => {
    const bounds = new Array<mj.Body>(layout.bounds.length);
    bounds[0] = mjLineToBounds(
        layout.bounds[layout.bounds.length - 1],
        layout.bounds[0],
        { ...matterOpts, isStatic: true }
    );
    for (let i = 1; i < layout.bounds.length; ++i) {
        bounds[i] = mjLineToBounds(
            layout.bounds[i - 1],
            layout.bounds[i],
            { ...matterOpts, isStatic: true }
        );
    }

    mj.Composite.add(mjEngine.world, bounds);


    const units = makeRandomLayoutUnits();
    unitlayout.randomizeLayoutUnits(layout, units, sampler);

    // step 1: add and solve all planetary units
    units.forEach((u, i) => {
        if ((i>0) && (layout.planets[i-1]))
        {
            const p = layout.planets[i-1];
            for (const unit of u)
            {
                const body = mjUnitToBody(unit);
                const constraint = mj.Constraint.create({
                    bodyA: body,
                    pointA: { x: 0, y: 0 },
                    pointB: { x: p.x, y: p.y },
                    length: p.radius/5,
                    damping: 0.1,
                    stiffness: 0.002,
                });
                mj.Composite.add(mjEngine.world, [body, constraint]);
            }
        }
    });

    startMJ();

    setTimeout(() => {
        mj.Composite.allBodies(mjEngine.world).forEach((body) => { body.isStatic=true; });
        mj.Composite.clear(mjEngine.world, true, true);
        
        for (const unit of units[0])
        {
            mj.Composite.add(mjEngine.world, mjUnitToBody(unit));
        }
        
    }, 1000);

});



const spawnArea = 3 * Math.sqrt(3) * radius * radius / 2.0 - 3.0 * planetRadius*planetRadius*Math.PI;

  
addTest("randomFill", () =>{
    const pointCount = (spawnArea * test.fill) / 100;
    for (let i = 0; i < pointCount; ++i)
    {
        const pos = sampler.sample(0);
        ctx.fillStyle="black";
        ctx.fillRect(pos.x, pos.y, 1, 1);
    }
});

addTest("solve", () => {
    unitlayout.drawSystem(ctx, layout);

    const units = makeRandomLayoutUnits();

    unitlayout.randomizeLayoutUnits(layout, units, sampler);

    ctx.strokeStyle = "red";
    unitlayout.drawLayoutUnits(ctx, units);

    unitlayout.solve(layout, units, undefined);

    ctx.strokeStyle = "green";
    unitlayout.drawLayoutUnits(ctx, units);
});

