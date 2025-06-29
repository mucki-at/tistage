
import * as THREE from 'three'
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import * as mj from "matter-js";

export interface PointLike
{
    x: number,
    y: number
}

export interface CircleLike extends PointLike
{
    radius: number
};


export interface System {
    bounds: PointLike[];
    planets: CircleLike[];
}

export function drawSystem(ctx: CanvasRenderingContext2D, system: System) {
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    ctx.moveTo(system.bounds[0].x, system.bounds[0].y);
    for (let i = 1; i < system.bounds.length; ++i)
        ctx.lineTo(system.bounds[i].x, system.bounds[i].y);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "purple";
    for (const p of system.planets) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

export function drawLayoutUnits(
    ctx: CanvasRenderingContext2D,
    units: Unit[][]
) {
    ctx.save();
    ctx.setLineDash([]);
    for (let uts of units) {
        for (let unit of uts) {
            if (unit.height > 0) {
                ctx.save();
                ctx.translate(unit.position.x, unit.position.y);
                ctx.rotate(unit.angle);
                ctx.strokeRect(
                    -unit.width / 2,
                    -unit.height / 2,
                    unit.width,
                    unit.height
                );
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(
                    unit.position.x,
                    unit.position.y,
                    unit.width,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
        }
        ctx.setLineDash([1, 1]);
    }
    ctx.restore();
}

export function makeHexagonSystem(bounds:CircleLike, planets: CircleLike[]) : System
{
    let hexagon = new Array<PointLike>(6);
    for (let i = 0; i < 6; ++i)
    {
        hexagon[i] = { x: bounds.x + Math.cos(i * Math.PI / 3) * bounds.radius, y: bounds.y + Math.sin(i * Math.PI / 3) * bounds.radius };
    }
    return { bounds: hexagon, planets: planets };
}

export interface Sampler
{
    sample(region : number) : PointLike;
}

export function makeCenterSampler(layout: System): Sampler {
    const sampler = {
        regions: [{ x: 0, y: 0 }].concat(layout.planets),
        sample(region: number): PointLike {
            if (region >= this.regions.length) return { x: 0, y: 0 };
            else return this.regions[region];
        },
    };
    return sampler;
}


export function makeRandomSampler(layout: System): Sampler {
    const spawningShape = new THREE.Shape(
        layout.bounds.map((pt) => new THREE.Vector2(pt.x, pt.y))
    );
    spawningShape.closePath();
    for (let p of layout.planets) {
        let planet = new THREE.Path();
        planet.absarc(p.x, p.y, p.radius, 0, 2 * Math.PI, false);
        planet.closePath();
        spawningShape.holes.push(planet);
    }

    const spawningGeometry = new THREE.ShapeGeometry(spawningShape);
    const spawningMesh = new THREE.Mesh(spawningGeometry);
    const spawner = new MeshSurfaceSampler(spawningMesh);
    spawner.build();

    const sampler = {
        planets: layout.planets,
        space: spawner,
        sample(region: number) {
            let pos = new THREE.Vector3(0, 0, 0);
            if (region == 0) {
                this.space.sample(pos);
            } else {
                const p = this.planets[region - 1];
                const r = Math.sqrt(Math.random()) * p.radius;
                const phi = Math.random() * 2 * Math.PI;
                pos.x = p.x + r * Math.cos(phi);
                pos.y = p.y + r * Math.sin(phi);
            }
            return pos;
        },
    };
    return sampler;
}

export interface Unit
{
    position: PointLike,
    angle: number,
    readonly width: number,
    readonly height: number
}

export type SolveFunction = (
    layout: System,
    units: Unit[][],
    sampler?: Sampler
) => void;

function placeRandomly(units: Unit[], sampler: Sampler, region: number) {
    for (let i = 0; i < units.length; ++i) {
        units[i].position = sampler.sample(region);
        units[i].angle = Math.random() * 2 * Math.PI;
    }
}

export function randomizeLayoutUnits(_: System, units: Unit[][], sampler?: Sampler) {
    if (sampler) {
        units.forEach((u, i) => placeRandomly(u, sampler, i));
    }
}

const mjDefaultBodyOptions : mj.IBodyDefinition = {
    friction: 1,
    frictionAir: 0.1,
    frictionStatic: 10,
    restitution: 1
}

function mjLineToBounds(
    a: PointLike,
    b: PointLike
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
        ...mjDefaultBodyOptions,
        isStatic: true,
    });
};

function mjUnitToBody(unit: Unit) {
    if (unit.height && unit.height > 0) {
        return mj.Bodies.rectangle(
            unit.position.x,
            unit.position.y,
            unit.width,
            unit.height,
            { ...mjDefaultBodyOptions, angle: unit.angle }
        );
    } else {
        return mj.Bodies.circle(unit.position.x, unit.position.y, unit.width, {
            ...mjDefaultBodyOptions,
            angle: unit.angle,
        });
    }
}

function solveMatter(layout: System, units: Unit[][], sampler?: Sampler) {
    const engine = mj.Engine.create({
        enableSleeping: true,
        gravity: { scale: 0 },
    });

    for (let i = 0; i < layout.bounds.length; ++i) {
        mj.Composite.add(
            engine.world,
            mjLineToBounds(layout.bounds.at(i - 1)!, layout.bounds.at(i)!)
        );
    }

    const mjUnits: mj.Body[][] = [];

    // step 1: add and solve all planetary units
    units.forEach((u, i) => {
        if (i > 0 && layout.planets[i - 1]) {
            mjUnits[i] = [];

            const p = layout.planets[i - 1];
            if (sampler) {
                placeRandomly(u, sampler, i);
            }

            for (const unit of u) {
                const body = mjUnitToBody(unit);
                mjUnits[i].push(body);
                const constraint = mj.Constraint.create({
                    bodyA: body,
                    pointA: { x: 0, y: 0 },
                    pointB: { x: p.x, y: p.y },
                    length: p.radius / 5,
                    damping: 0.1,
                    stiffness: 0.002,
                });
                mj.Composite.add(engine.world, [body, constraint]);
            }
        }
    });

    // these bodies and constraints never sleep
    while (engine.timing.timestamp < 500) {
        mj.Engine.update(engine);
    }

    // now make the planet units static
    mj.Composite.allBodies(engine.world).forEach((body) => {
        body.isStatic = true;
    });
    mj.Composite.clear(engine.world, true, true);

    // phase 2: place and solve space units
    if (sampler) {
        placeRandomly(units[0], sampler, 0);
    }

    mjUnits[0] = [];
    for (const unit of units[0]) {
        const body = mjUnitToBody(unit);
        mjUnits[0].push(body);
        mj.Composite.add(engine.world, body);
    }

    while (
        !mj.Composite.allBodies(engine.world).every((body) => body.isSleeping)
    ) {
        mj.Engine.update(engine);
        if (engine.timing.timestamp > 1500) break;
    }

    units.forEach((u, i) => {
        u.forEach((unit, j) =>
        {
            if (mj.Vertices.contains(layout.bounds, mjUnits[i][j].position))
            {
                unit.position = mjUnits[i][j].position;
                unit.angle = mjUnits[i][j].angle;
            }
            else
            {
                console.log(
                    `solver error: unit position ${mjUnits[i][j].position.x},${mjUnits[i][j].position.x} is out of bounds`
                );
                unit.position = {x:0, y:0};
                unit.angle=0;
            }
        });
    });
}

export const solve: SolveFunction = solveMatter;