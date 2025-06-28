
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

export interface LayoutDefinition {
    bounds: PointLike[];
    planets: CircleLike[];
}

export function makeSystemLayout(bounds:CircleLike, planets: CircleLike[]) : LayoutDefinition
{
    let hexagon = new Array<PointLike>(6);
    for (let i = 0; i < 6; ++i)
    {
        hexagon[i] = { x: bounds.x + Math.cos(i * Math.PI / 3) * bounds.radius, y: bounds.y -Math.sin(i * Math.PI / 3) * bounds.radius };
    }
    return { bounds: hexagon, planets };
}

export interface Sampler
{
    sample(region : number) : PointLike;
}

export interface InspectableSampler extends Sampler {
    space?: MeshSurfaceSampler;
}

export function makeCenterSampler(layout: LayoutDefinition): Sampler
{
    const sampler = {
        regions: [{x:0, y:0}].concat(layout.planets),
        sample(region: number) : PointLike
        {
            if (region>=this.regions.length) return { x: 0, y: 0 }
            else return this.regions[region];
        },
    };
    return sampler;
}


export function makeRandomSampler(layout: LayoutDefinition) : Sampler
{
    const spawningShape = new THREE.Shape(layout.bounds.map(pt => new THREE.Vector2(pt.x, pt.y)));
    spawningShape.closePath();
    for (let p of layout.planets)
    {
        let planet=new THREE.Path();
        planet.absarc(
            p.x,
            p.y,
            p.radius,
            0,
            2*Math.PI,
            false
        );
        planet.closePath();
        spawningShape.holes.push(planet);
    }
    
    const spawningGeometry = new THREE.ShapeGeometry(spawningShape);
    const spawningMesh = new THREE.Mesh(spawningGeometry);
    const spawner = new MeshSurfaceSampler(spawningMesh);
    spawner.build();

    const sampler =
    {
        planets:layout.planets,
        space:spawner,
        sample(region:number)
        {
            let pos=new THREE.Vector3(0,0,0);
            if (region==0)
            {
                this.space.sample(pos);
            }
            else
            {
                const p = this.planets[region-1];
                const r = Math.sqrt(Math.random()) * p.radius;
                const phi = Math.random()*2*Math.PI;
                pos.x = p.x + r * Math.cos(phi);
                pos.y = p.y + r * Math.sin(phi);
            }
            return pos;
        }
    }
    return sampler;
}

export interface LayoutUnit
{
    position: PointLike,
    angle: number,
    readonly width: number,
    readonly height: number
}


export interface UnitArranger
{
    arrange(region: number, units: LayoutUnit[]): void;
}

export function makeNullArranger(
    _: LayoutDefinition,
    sampler?: Sampler
): UnitArranger
{
    const arranger = {
        sampler: sampler,
        arrange(region: number, units: LayoutUnit[]): void
        {
            if (this.sampler)
            {
                for (let i = 0; i < units.length; ++i)
                {
                    units[i].position = this.sampler.sample(region);
                }
            }
        },
    };

    return arranger;
}

const mjDefaultBodyOptions : mj.IBodyDefinition = {
    friction: 1,
    frictionAir: 0.1,
    frictionStatic: 10,
    restitution: 1
}

export function mjLineToBounds(
    a: PointLike,
    b: PointLike,
    options: mj.IBodyDefinition = mjDefaultBodyOptions
) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const overshoot = 0.2;
    const thickness = 1;

    const tr = { x: b.x + dx * overshoot, y: b.y + dy * overshoot };
    const br = { x: a.x - dx * overshoot, y: a.y - dy * overshoot };
    const tl = { x: tr.x - dy * thickness, y: tr.y + dx * thickness };
    const bl = { x: br.x - dy * thickness, y: br.y + dx * thickness };

    const cx = (tr.x + bl.x) / 2;
    const cy = (tr.y + bl.y) / 2;

    return mj.Bodies.fromVertices(cx, cy, [[tr, br, bl, tl]], { ...options, isStatic:true } );
};

export function makeMatterArranger(
    layout: LayoutDefinition,
    sampler?: Sampler,
    options: mj.IBodyDefinition = mjDefaultBodyOptions
) {
    const bounds = new Array<mj.Body>(layout.bounds.length);
    bounds[0] = mjLineToBounds(
        layout.bounds[layout.bounds.length - 1],
        layout.bounds[0],
        options
    );
    for (let i = 1; i < layout.bounds.length; ++i) {
        bounds[i] = mjLineToBounds(layout.bounds[i - 1], layout.bounds[i], options);
    }

    const planets = layout.planets.map((planet) =>
        mj.Bodies.circle(planet.x, planet.y, planet.radius, { ...options, slop: 2, isStatic: true })
    );

    const arranger = {
        bounds: bounds,
        planetDefs: layout.planets,
        planets: planets,
        sampler: sampler,
        options: options,
        arrange(region: number, units: LayoutUnit[]): void
        {
            const engine = mj.Engine.create({
                enableSleeping: true,
                gravity: { scale: 0 },
            });

            if (region == 0)
            {
                mj.Composite.add(engine.world, this.bounds);
                mj.Composite.add(engine.world, this.planets);
            }
            else
            {
                let pd=this.planetDefs[region-1];
                let circle = new Array<PointLike>(12);
                for (let i = 0; i < circle.length; ++i)
                {
                    circle[i] = { x: pd.x + Math.cos(i * Math.PI * 2 / circle.length) * pd.radius, y: pd.y - Math.sin(i * Math.PI *  2/ circle.length) * pd.radius };
                }
                mj.Composite.add(engine.world,mjLineToBounds(
                    circle[circle.length - 1],
                    circle[0],
                    { ...this.options, slop: 2 }
                ));
                for (let i = 1; i < circle.length; ++i) {
                    mj.Composite.add(engine.world,mjLineToBounds(circle[i - 1], circle[i], this.options))
                }
            }

            const collisionUnits = units.map((unit) => {
                const pos = sampler?.sample(region) ?? unit.position;
                let ang = unit.angle;
                if (sampler) {
                    ang = Math.atan2(pos.y, pos.x) + Math.PI / 2;
                }
                return mj.Bodies.rectangle(
                    pos.x,
                    pos.y,
                    unit.width,
                    unit.height,
                    {
                        ...this.options,
                        angle: ang,
                        sleepThreshold: 60,
                    }
                );
            });
            mj.Composite.add(engine.world, collisionUnits);

            while (
                !mj.Composite.allBodies(engine.world).every(
                    (body) => body.isSleeping
                )
            ) {
                mj.Engine.update(engine);
                if (engine.timing.timestamp > 1000) break;
            }

            for (let i = 0; i < units.length; ++i) {
                units[i].position.x = collisionUnits[i].position.x;
                units[i].position.y = collisionUnits[i].position.y;
                units[i].angle = collisionUnits[i].angle;
            }
        },
    };

    return arranger;
}
