import * as THREE from "three";
import * as utils from "./utils.mjs";
import { randFloat } from "three/src/math/MathUtils.js";

export class Table extends THREE.Mesh {
    constructor(radius, texture) {
        var geom = new THREE.CircleGeometry(radius, 6, Math.PI/6);
        geom.rotateX(-Math.PI / 2);
        super(geom);

        this.material=new THREE.MeshBasicMaterial();
        this.material.color = new THREE.Color('saddlebrown');

        utils.asyncLoadGltfMaterial(texture).then((mat) => {
            this.material = mat;
            window.updateRoom();
        });
    }

    static TileRadius = 0.0585;
    static basis = [1, 0, 0, 1];
    static basis_inv = [1, 0, 0, 1];
    static directions = [
        [1, 0],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [0, -1],
        [1, -1],
    ];

    static {
        const cos30 = Math.sqrt(3) / 2;
        const sin30 = 0.5;

        this.basis = [
            0,
            1.5 * this.TileRadius,
            Math.sqrt(3) * this.TileRadius,
            (Math.sqrt(3) * this.TileRadius) / 2.0,
        ];

        const det =
            this.basis[0] * this.basis[3] - this.basis[1] * this.basis[2];

        this.basis_inv = [
            this.basis[3] / det,
            -this.basis[1] / det,
            -this.basis[2] / det,
            this.basis[0] / det,
        ];
    }

    static CartesianFromAxial(axial) {
        return [
            this.basis[0] * axial[0] + this.basis[1] * axial[1],
            this.basis[2] * axial[0] + this.basis[3] * axial[1],
        ];
    }

    static AxialFromCartesian(cartesian) {
        return [
            this.basis_inv[0] * cartesian[0] + this.basis_inv[1] * cartesian[1],
            this.basis_inv[2] * cartesian[0] + this.basis_inv[3] * cartesian[1],
        ];
    }

    static Vector3FromAxial(axial) {
        const cart = this.CartesianFromAxial(axial);
        return new THREE.Vector3(cart[0], 0, -cart[1]);
    }

    static AxialFromVector3(vector) {
        return this.AxialFromCartesian([vector.x, -vector.z]);
    }

    static TileIdFromAxial(axial) {
        const cart = this.CartesianFromAxial(axial);
        var a = Math.round(cart[0]);
        var b = Math.round(cart[1]);
        cart[0] -= a;
        cart[1] -= b;

        // check for the top-left and bottom-right sections
        var disciminator = cart[0] - cart[1];

        if (disciminator < -0.5) {
            a -= 1;
            b += 1;
        } else if (disciminator > 0.5) {
            a += 1;
            b -= 1;
        }
        return [a, b];
    }

    static TileIdFromCartesian(cartesian) {
        return this.TileIdFromAxial(this.AxialFromCartesian(cartesian));
    }

    static TileIdFromVector3(vector) {
        return this.TileIdFromAxial(this.AxialFromVector3(vector));
    }

    // ring and slot notation like async TI (slots start at 1 to the north)
    static TileIdFromRingAndSlot(ring, slot) {
        if (ring < 0) return undefined;
        if (ring == 0) return [0, 0];
        if (slot <= 0 || slot > ring * 6) return undefined;

        var side = Math.ceil(slot / ring)-1;
        var dir = (side + 2) % 6;
        var steps = (slot-1) % ring;

        var a = this.directions[side][0] * ring;
        var b = this.directions[side][1] * ring;
        a += this.directions[dir][0] * steps;
        b += this.directions[dir][1] * steps;
        return [a, b];
    }

    getSystem(tileId) {
        return this.getObjectByProperty("tileId", tileId);
    }

    setSystem(tileId, system) {
        const existing = this.getSystem(tileId);
        if (existing) {
            existing.removeFromParent();
        }
        system.tileId = tileId;
        system.position.copy(Table.Vector3FromAxial(tileId));
        system.rotateY(THREE.MathUtils.randFloat(-0.02, 0.02));
        system.rotateX(THREE.MathUtils.randFloat(-0.01, 0.01));
        system.rotateZ(THREE.MathUtils.randFloat(-0.01, 0.01));
        this.add(system);
    }

    clearSystems()
    {
        const systems = this.children.filter((obj) => Object.hasOwn(obj, "tileId"));
        this.remove.apply(this, systems);
    }
}
