import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

export class UnitLayout {
    constructor(bounds, planets)
    {
        this.bounds = bounds;
        this.planets = planets;
    }

    arrangeUnitsInArea(units, where)
    {
        let location=this.bounds;
        if (where>0) location=this.planets[where-1];
        units.forEach(element => {
            element.position.set(location.x, 0, location.y);
        });
    }
}