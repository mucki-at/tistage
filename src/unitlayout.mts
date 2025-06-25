
import * as THREE from 'three'
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import * as DC from 'detect-collisions';

export interface PointLike
{
    x: number,
    y: number
}

export interface PlanetDefinition
{
    center: PointLike,
    radius: number
};

export interface LayoutDefinition
{
    bounds: PointLike[],
    planets: PlanetDefinition[]
}

export function makeHexagonLayout(radius:number, planets: PlanetDefinition[])
{
    let hexagon = new Array<PointLike>(6);
    for (let i = 0; i < 6; ++i)
    {
        hexagon[i] = { x: Math.cos(i * Math.PI / 3) * radius, y: -Math.sin(i * Math.PI / 3) * radius };
    }
    return { bounds: hexagon, planets };
}

export interface Sampler
{
    sample() : PointLike;
}

export interface InspectableSampler extends Sampler {
    spawner?: MeshSurfaceSampler;
}

export function makeRandomSampler(layout: LayoutDefinition) : Sampler
{
    const spawningShape = new THREE.Shape(layout.bounds.map(pt => new THREE.Vector2(pt.x, pt.y)));
    spawningShape.closePath();
    for (let p of layout.planets)
    {
        let planet=new THREE.Path();
        planet.absarc(
            p.center.x,
            p.center.y,
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
        spawner:spawner,
        sample() {
            let pos=new THREE.Vector3(0,0,0);
            spawner.sample(pos);
            return pos;
        }
    }
    return sampler;
}

export interface LayoutUnit
{
    position: PointLike
    radius: number
}


export interface UnitArranger
{
    arrange(units: LayoutUnit[]): void;
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

    const planets = layout.planets.map(planet => new DC.Ellipse(planet.center, planet.radius, undefined, undefined, {isStatic: true}));
    
    const arranger =
    {
        bounds: bounds,
        planets: planets,
        sampler: sampler,
        arrange(units: LayoutUnit[]): void
        {
            const system = new DC.System();
            this.bounds.forEach((bound) => system.insert(bound));
            this.planets.forEach((planet) => system.insert(planet));
            const collisionUnits = units.map(unit => system.createEllipse(sampler?.sample() ?? unit.position, unit.radius));

            for (let i=0; i<10; ++i)
            {
                system.separate();
            }

            for (let i=0; i<units.length; ++i)
            {
                units[i].position.x=collisionUnits[i].x;
                units[i].position.y=collisionUnits[i].y;
            }
        }
    }

    return arranger;
}

