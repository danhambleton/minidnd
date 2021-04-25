import * as THREE from "three";

class HexGrid {

    constructor() {

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