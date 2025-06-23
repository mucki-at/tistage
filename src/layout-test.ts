import "./layout-test.css"
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import * as THREE from "three";
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

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
    shape: THREE.Shape,
    segments: number = 12,
    style: string = "green",
    holeStyle: string = "red"
) {
    drawPath(shape, segments, style);
    for (let hole of shape.holes) drawPath(hole, segments, holeStyle);
}

function drawShapeGeometryBounds(shape: THREE.ShapeGeometry) {
    if (Array.isArray(shape.parameters.shapes) === false) {
        drawShape(shape.parameters.shapes, shape.parameters.curveSegments);
    } else {
        for (let sub of shape.parameters.shapes)
            drawShape(sub, shape.parameters.curveSegments);
    }
}

function drawGeometryTriangles(shape: THREE.BufferGeometry, style:string = "black")
{
    const triGeom = shape.toNonIndexed()!;
    const triangles = triGeom.getAttribute('position')!;

    ctx.strokeStyle = style;
    ctx.beginPath();

    for (let i=0; i<triangles.count; i+=3)
    {
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

let hexagon = new Array<THREE.Vector2>(6);
for (let i = 0; i < 6; ++i)
{
    hexagon[i] = new THREE.Vector2(Math.cos(i * Math.PI / 3) * 500, -Math.sin(i * Math.PI / 3) * 500);
}
let spawnArea = 3*Math.sqrt(3)*radius*radius/2;
const spawningShape = new THREE.Shape(hexagon);
spawningShape.closePath();
for (let i=0; i<3; ++i)
{
    let planet=new THREE.Path();
    planet.absarc(
        Math.cos((i * Math.PI) / 1.5) * 250,
        -Math.sin((i * Math.PI) / 1.5) * 250,
        150,
        0,
        2*Math.PI,
        false
    );
    spawnArea -= 150 * 150 * Math.PI;

    planet.closePath();
    spawningShape.holes.push(planet);
}

const spawningGeometry = new THREE.ShapeGeometry(spawningShape);
const spawningMesh = new THREE.Mesh(spawningGeometry);
const spawner = new MeshSurfaceSampler(spawningMesh);
spawner.build();

const test =
{
    fill: 50.0,
    bounds: drawBounds,
    triangles: drawTriangles,
    randomFill: randomFill,
};

function drawBounds()
{
    ctx.clearRect(-500, -500, 1001, 1001);
    drawShapeGeometryBounds(spawningGeometry);
}

function drawTriangles()
{
    ctx.clearRect(-500, -500, 1001, 1001);
    drawGeometryTriangles(spawningGeometry);
}
    
function randomFill()
{
    ctx.clearRect(-500, -500, 1001, 1001);
    const pointCount = spawnArea * test.fill / 100;
    let pos=new THREE.Vector3(0,0,0);
    for (let i =0; i<pointCount; ++i)
    {
        spawner.sample(pos);
        ctx.fillRect(pos.x, pos.y, 1, 1);
    }

}

const gui = new GUI({ width: 310 });
gui.add(test, 'fill', 0, 100, 1);
for (let key in test)
{
    if (test[key] instanceof Function)
    {
        gui.add(test, key);
    }
}
