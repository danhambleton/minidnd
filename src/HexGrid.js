import * as THREE from "three";

class HexGrid {


    
    constructor() {

    }

    NeighbourOffsets()
    {
        return {
            0 : new THREE.Vector3(0, 1, -1),
            1 : new THREE.Vector3(1, 0, -1),
            2 : new THREE.Vector3(1, -1, 0),
            3 : new THREE.Vector3(0, -1, 1),
            4 : new THREE.Vector3(-1, 0, 1),
            5 : new THREE.Vector3(-1, 1, 0),

            6 : new THREE.Vector3(0, 2, -2),
            7 : new THREE.Vector3(1, 1, -2),
            8 : new THREE.Vector3(2, 0, -2),
            9 : new THREE.Vector3(2, -1, -1),
            10 :new THREE.Vector3(2, -2, 0),
            11 : new THREE.Vector3(1, -2, 1),

            12 : new THREE.Vector3(0, -2, 2),
            13 : new THREE.Vector3(-1, -1, 2),
            14 : new THREE.Vector3(-2, 0, 2),
            15 : new THREE.Vector3(-2, 1, 1),
            16 : new THREE.Vector3(-2, 2, 0),
            17 : new THREE.Vector3(-1, 2, -1)
        }
    }

    CoordToHex(p, scale)
    {
        var q = ((2.0/3.0) * p.x) / scale;
        var r = ((Math.sqrt(3.0)/3.0) * p.y -  1.0/3.0 * p.x) / scale;

        return new THREE.Vector3(q, -q-r, r);
    }

    HexToCoord(h, scale)
    {
        var hcx = scale * (0.0 + (3.0 / 2.0) * h.x);
        var hcy = scale * (Math.sqrt(3.0) * h.z + (Math.sqrt(3.0) / 2.0) * h.x);   
        
        return new THREE.Vector3(hcx, hcy, 0.0);
    }

    HexRound(h)
    {
        var rx = Math.round(h.x);
        var ry = Math.round(h.y);
        var rz = Math.round(h.z);
    
        var x_diff = Math.abs(rx - h.x);
        var y_diff = Math.abs(ry - h.y);
        var z_diff = Math.abs(rz - h.z);
    
        if (x_diff > y_diff && x_diff > z_diff)
        {
            rx = -ry-rz;
        }
        else if (y_diff > z_diff)
        {
            ry = -rx-rz;
        }
        else
        {
            rz = -rx-ry;
        }

        return new THREE.Vector3(rx, ry, rz)
    }

    HexCenterFromPoint(p, scale)
    {
        return this.HexToCoord(this.HexRound(this.CoordToHex(p, scale)), scale);
    }

}

export {
    HexGrid
};