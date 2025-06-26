
import * as THREE from 'three'
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import * as DC from 'detect-collisions';

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
    spawner?: MeshSurfaceSampler;
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
    readonly radius: number
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

export function makeDCArranger(layout: LayoutDefinition, sampler?: Sampler): UnitArranger
{
    const bounds = new Array<DC.Line>(layout.bounds.length);
    bounds[0] = new DC.Line(
        layout.bounds[0],
        layout.bounds[layout.bounds.length - 1],
        { isStatic: true }
    );
    for (let i=1; i<layout.bounds.length; ++i)
    {
        bounds[i] = new DC.Line(layout.bounds[i], layout.bounds[i-1], {
            isStatic: true,
        });
    }

    const planets = layout.planets.map(planet => new DC.Ellipse(planet, planet.radius, undefined, undefined, {isStatic: true}));
    
    const arranger =
    {
        bounds: bounds,
        planets: planets,
        sampler: sampler,
        arrange(region: number, units: LayoutUnit[]): void
        {
            if (region==0)
            {
                const system = new DC.System();
                this.bounds.forEach((bound) => system.insert(bound));
                this.planets.forEach((planet) => system.insert(planet));
                const collisionUnits = units.map(unit => system.createEllipse(sampler?.sample(region) ?? unit.position, unit.radius));

                for (let i=0; i<10; ++i)
                {
                    system.separate();
                }

                for (let i=0; i<units.length; ++i)
                {
                    units[i].position.x=collisionUnits[i].x;
                    units[i].position.y=collisionUnits[i].y;
                    units[i].angle = Math.random() * 2 * Math.PI;
                }
            }
            else
            {
                if (this.sampler) {
                    for (let i = 0; i < units.length; ++i) {
                        units[i].position = this.sampler.sample(region);
                        units[i].angle = Math.random() * 2 * Math.PI;
                    }
                }
        
            }
        }
    }

    return arranger;
}

