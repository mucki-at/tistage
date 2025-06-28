import { GUI } from "three/addons/libs/lil-gui.module.min.js";
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
ctx.setTransform(10, 0, 0, -10, 50, 50);
ctx.lineWidth=0.1;


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
    radius: 50
}

const gui = new GUI({ width: 310 });
gui.add(test, 'fill', 0, 100, 1);
gui.add(test, "units", 1, 100, 1);
gui.add(test, "radius", 1, 500, 10);


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

const layout = unitlayout.makeSystemLayout(
    { x: 0, y: 0, radius: radius },
    planets
);
const sampler: unitlayout.InspectableSampler =
    unitlayout.makeRandomSampler(layout);

//// helpers to draw shape geometries on canvas

function drawPath(
    ctx: CanvasRenderingContext2D,
    path: THREE.Path,
    segments: number = 12,
    style: string = "black"
) {
    const points = path.getPoints(segments);
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; ++i)
        ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
}

function drawShape(
    ctx: CanvasRenderingContext2D,
    shape: THREE.Shape,
    segments: number = 12,
    style: string = "green",
    holeStyle: string = "red"
) {
    drawPath(ctx, shape, segments, style);
    for (let hole of shape.holes) drawPath(ctx, hole, segments, holeStyle);
}

function drawShapeGeometryBounds(
    ctx: CanvasRenderingContext2D,
    shape: THREE.ShapeGeometry
) {
    if (Array.isArray(shape.parameters.shapes) === false) {
        drawShape(ctx, shape.parameters.shapes, shape.parameters.curveSegments);
    } else {
        for (let sub of shape.parameters.shapes)
            drawShape(ctx, sub, shape.parameters.curveSegments);
    }
}

function drawGeometryTriangles(
    ctx: CanvasRenderingContext2D,
    shape: THREE.BufferGeometry,
    style: string = "black"
) {
    const triGeom = shape.toNonIndexed()!;
    const triangles = triGeom.getAttribute("position")!;

    ctx.strokeStyle = style;
    ctx.beginPath();

    for (let i = 0; i < triangles.count; i += 3) {
        let v0 = new THREE.Vector3();
        let v1 = new THREE.Vector3();
        let v2 = new THREE.Vector3();
        v0.fromBufferAttribute(triangles, i + 0);
        v1.fromBufferAttribute(triangles, i + 1);
        v2.fromBufferAttribute(triangles, i + 2);
        ctx.moveTo(v0.x, v0.y);
        ctx.lineTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.lineTo(v0.x, v0.y);
    }

    ctx.stroke();
    triGeom.dispose();
}

//// matter-js tests


// create an engine
const mjEngine = mj.Engine.create({enableSleeping: true});

// create a renderer
const mjRender = mj.Render.create({
    canvas: canvas,
    engine: mjEngine,
//    bounds: { min: {x:-500, y:-500}, max: {x:500, y:500}},
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

    ctx.setTransform(5, 0, 0, -5, 500, 500);
    ctx.lineWidth = 0.1;
    ctx.clearRect(-500, -500, 1001, 1001);
}

stopMJ();

addTest("mjSimple", ()=>{
    mj.Composite.clear(mjEngine.world, false, true);

    mjEngine.world.gravity.scale = 1;

    // create two boxes and a ground
    var boxA = mj.Bodies.rectangle(100, 100, 80, 80);
    var boxB = mj.Bodies.rectangle(100, 200, 80, 80);
    var ground = mj.Bodies.rectangle(500, 950, 1000, 60, { isStatic: true });

    // add all of the bodies to the world
    mj.Composite.add(mjEngine.world, [boxA, boxB, ground]);

    // run the renderer
    mj.Render.run(mjRender);
    // run the engine
    mj.Runner.run(mjRunner, mjEngine);
});

addTest("mjPackRectangles", ()=>{
    mj.Composite.clear(mjEngine.world, false, true);

    mjEngine.world.gravity.scale = 0;

    // create a box to fill
    let box = [
        mj.Bodies.rectangle(500, 75, 1000, 50, { isStatic: true }),
        mj.Bodies.rectangle(500, 925, 1000, 50, { isStatic: true }),
        mj.Bodies.rectangle(75, 500, 50, 1000, { isStatic: true }),
        mj.Bodies.rectangle(925, 500, 50, 1000, { isStatic: true }),
    ];

    // add all of the bodies to the world
    mj.Composite.add(mjEngine.world, box);

    // run the renderer
    mj.Render.run(mjRender);
    // run the engine
    mj.Runner.run(mjRunner, mjEngine);

    mouseClick= (x:number,y:number)=>
    {
        console.log(`x: ${x}, y: ${y}`);
        mj.Composite.add(mjEngine.world, mj.Bodies.rectangle(x, y, 100, 10, { angle: Math.random()*Math.PI*2, restitution: 0.2 }));
        mj.Composite.allBodies(mjEngine.world).forEach((body) => mj.Sleeping.set(body, false));
    }
});


addTest("mjArrangeLive", () => {
    mj.Composite.clear(mjEngine.world, false, true);
    mjEngine.world.gravity.scale = 0;

    const bounds = new Array<mj.Body>(layout.bounds.length);
    bounds[0] = unitlayout.mjLineToBounds(
        layout.bounds[layout.bounds.length - 1],
        layout.bounds[0]
    );
    for (let i = 1; i < layout.bounds.length; ++i) {
        bounds[i] = unitlayout.mjLineToBounds(
            layout.bounds[i - 1],
            layout.bounds[i]
        );
    }

    const planets = layout.planets.map((planet) =>
        mj.Bodies.circle(planet.x, planet.y, planet.radius, { isStatic: true })
    );

    mj.Composite.add(mjEngine.world, bounds);
    mj.Composite.add(mjEngine.world, planets);

    const units=new Array<unitlayout.LayoutUnit>(test.units);
    for (let i=0; i<units.length; ++i)
    {
        units[i]={ position: sampler.sample(0), angle: Math.random() * 2 * Math.PI, width:test.radius, height: test.radius/2 };
    }
    const collisionUnits = units.map((unit) => {
        const pos = unit.position;
        return mj.Bodies.rectangle(pos.x, pos.y, unit.width, unit.height,
        {
            angle: unit.angle,
            sleepThreshold: 60,
        });
    });

    mj.Composite.add(mjEngine.world, collisionUnits);

    // run the renderer
    mj.Render.lookAt(mjRender, mj.Composite.allBodies(mjEngine.world));
    mj.Render.run(mjRender);
    // run the engine
    mj.Runner.run(mjRunner, mjEngine);
});



const mjArranger = unitlayout.makeMatterArranger(layout);
addTest("arrangeMJ", () => {
    testArrange(mjArranger);
});


const spawnArea = 3 * Math.sqrt(3) * radius * radius / 2.0 - 3.0 * planetRadius*planetRadius*Math.PI;


addTest("bounds", ()=>{
    if (sampler.space) {
        const geom = sampler.space.geometry;
        if ("parameters" in geom) {
            drawShapeGeometryBounds(ctx, geom as THREE.ShapeGeometry);
        } else {
            drawGeometryTriangles(ctx,geom);
        }
    }
});

addTest("triangles", ()=>{
    ctx.clearRect(-500, -500, 1001, 1001);
    if (sampler.space) {
        drawGeometryTriangles(ctx, sampler.space.geometry);
    }
});
    
addTest("randomFill", () =>{
    const pointCount = (spawnArea * test.fill) / 100;
    for (let i = 0; i < pointCount; ++i)
    {
        const pos = sampler.sample(0);
        ctx.fillRect(pos.x, pos.y, 1, 1);
    }
});

function testArrange(
    arranger: unitlayout.UnitArranger)
{
    test.bounds();

    const units=new Array<unitlayout.LayoutUnit>(test.units);
    for (let i=0; i<units.length; ++i)
    {
        units[i]={ position: sampler.sample(0), angle: Math.random()*2*Math.PI, width:test.radius, height:test.radius/2 };
    }

    ctx.strokeStyle = "red";
    for (let i = 0; i < units.length; ++i)
    {
        ctx.save();
        ctx.translate(units[i].position.x, units[i].position.y);
        ctx.rotate(units[i].angle);
        ctx.strokeRect(-units[i].width/2, -units[i].height/2, units[i].width, units[i].height);
        ctx.restore();
    }

    arranger.arrange(0,units);

    ctx.strokeStyle = "green";
    for (let i = 0; i < units.length; ++i) {
        ctx.save();
        ctx.translate(units[i].position.x, units[i].position.y);
        ctx.rotate(units[i].angle);
        ctx.strokeRect(
            -units[i].width / 2,
            -units[i].height / 2,
            units[i].width,
            units[i].height
        );
        ctx.restore();
    }
}

