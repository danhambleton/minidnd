
import * as THREE from "three";

class SoundCue {
    constructor(){

        this.type = "sound";

        this.src = "";
        this.id = "";
        this.volume = 0.75;
        this.echo = 0.0;
        this.reverb = 0.0;
        this.pan = 0.0;
        this.fade_in = 1.0;
        this.fade_out = 1.0;
        this.loop = false;

    }
}

class ModelCue {
    constructor(){

        this.type = "model";

        this.src = "";
        this.id = "";
        this.scale = 1.0;
        this.position = new THREE.Vector3(0.0, 0.0, 0.0);
        this.rotation = new THREE.Vector3(0.0, 0.0, 0.0);
        this.color = new THREE.Color(0.75, 0.75, 0.75, 1.0);
        this.matcap = "";

    }
}

class MapCue {
    constructor(){

        this.type = "map";

        this.src = "";
        this.id = "";
        this.showGrid = false;
        this.gridScale = 0.04;
        this.color = new THREE.Color(1.0, 1.0, 1.0, 0.1);

    }
}

export {
    SoundCue,
    ModelCue,
    MapCue
};