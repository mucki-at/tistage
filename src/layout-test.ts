import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import * as THREE from "three";
import * as unitlayout from "./unitlayout.mts"
import * as DC from "detect-collisions"

const drawingboard = document.getElementById("drawingboard")!;
const canvas: HTMLCanvasElement = document.createElement("canvas")!;
canvas.width = 1001;
canvas.height = 1001;
canvas.style.backgroundColor = 'lightgray';
drawingboard.appendChild(canvas);
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
ctx.setTransform(1, 0, 0, -1, 500, 500);

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

//// create our spawning area
const radius = 500;
const planetRadius = 150;
const planetPos = 250;

const planets = [
    { center: { x: planetPos, y: 0 }, radius: planetRadius },
    {
        center: { x: -0.5 * planetPos, y: -0.866 * planetPos },
        radius: planetRadius,
    },
    {
        center: { x: -0.5 * planetPos, y: 0.866 * planetPos },
        radius: planetRadius,
    },
];

const layout = unitlayout.makeHexagonLayout(radius, planets);
const sampler : unitlayout.InspectableSampler = unitlayout.makeRandomSampler(layout);
const spawnArea = 3 * Math.sqrt(3) * radius * radius / 2.0 - 3.0 * planetRadius*planetRadius*Math.PI;

const dcArranger = unitlayout.makeDCArranger(layout);

const test =
{
    fill: 50.0,
    units: 10,
    radius: 50,
    bounds: drawBounds.bind(this, ctx, sampler),
    triangles: drawTriangles.bind(this,ctx, sampler),
    randomFill: randomFill.bind(this,ctx, sampler),
    arrangeDC: testArrange.bind(this, ctx, sampler, dcArranger),
};

function drawBounds(
    ctx: CanvasRenderingContext2D,
    sampler: unitlayout.InspectableSampler
) {
    ctx.clearRect(-500, -500, 1001, 1001);
    if (sampler.spawner) {
        const geom = sampler.spawner.geometry;
        if ("parameters" in geom) {
            drawShapeGeometryBounds(ctx, geom as THREE.ShapeGeometry);
        } else {
            drawGeometryTriangles(ctx,geom);
        }
    }
}

function drawTriangles(
    ctx: CanvasRenderingContext2D,
    sampler: unitlayout.InspectableSampler
) {
    ctx.clearRect(-500, -500, 1001, 1001);
    if (sampler.spawner) {
        drawGeometryTriangles(ctx, sampler.spawner.geometry);
    }
}
    
function randomFill(
    ctx: CanvasRenderingContext2D,
    sampler: unitlayout.InspectableSampler
) {
    ctx.clearRect(-500, -500, 1001, 1001);
    const pointCount = (spawnArea * test.fill) / 100;
    for (let i = 0; i < pointCount; ++i)
    {
        const pos = sampler.sample();
        ctx.fillRect(pos.x, pos.y, 1, 1);
    }
}

function testArrange(ctx: CanvasRenderingContext2D,
    sampler: unitlayout.Sampler,
    arranger: unitlayout.UnitArranger)
{
    drawBounds(ctx, sampler);

    const units=new Array<unitlayout.LayoutUnit>(test.units);
    for (let i=0; i<units.length; ++i)
    {
        units[i]={ position: sampler.sample(), radius:test.radius };
    }

    ctx.strokeStyle = "red";
    for (let i = 0; i < units.length; ++i)
    {
        ctx.beginPath();
        ctx.arc(
            units[i].position.x,
            units[i].position.y,
            units[i].radius,
            0,
            2 * Math.PI
        );
        ctx.stroke();
    }

    arranger.arrange(units);

    ctx.strokeStyle = "green";
    for (let i = 0; i < units.length; ++i) {
        ctx.beginPath();
        ctx.arc(
            units[i].position.x,
            units[i].position.y,
            units[i].radius,
            0,
            2 * Math.PI
        );
        ctx.stroke();
    }

}

const gui = new GUI({ width: 310 });
gui.add(test, 'fill', 0, 100, 1);
gui.add(test, "units", 1, 100, 1);
gui.add(test, "radius", 1, 500, 10);
for (const [key, value] of Object.entries(test))
{
    if (value instanceof Function)
    {
        gui.add(test, key as any);
    }
}
