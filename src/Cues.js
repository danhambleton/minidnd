
import * as THREE from "three";

export const CueType = {
    SOUND : "sound",
    MODEL : "model",
    MAP : "map",
    VOLUME : "volume",
    AUDIOKILL : "audio kill",
    VISUALKILL : "visual kill",
    PLAYERMOVE : "player move",
    DELETE : "delete",
    PLAYERCONNECT : "player connect"
}

export const CueState = {
        EMPTY : "empty",
        READY : "ready",
        ACTIVE : "active",
        PLAYING : "playing"
};

class SoundCue {
    constructor(){

        this.type = CueType.SOUND;
        this.name = "";

        this.src = "";
        this.id = "";
        this.volume = 0.75;
        this.echo = 0.0;
        this.reverb = 0.0;
        this.pan = 0.0;
        this.fade_in = 1.0;
        this.fade_out = 1.0;
        this.loop = false;
        this.state = null;
        this.effects = [];
        this.media = null;

    }
}

class ModelCue {
    constructor(){

        this.type = CueType.MODEL;
        this.name = "";

        this.src = "";
        this.id = "";
        this.scale = 1.0;
        this.position = {x : 0, y : 0, z : 0};//new THREE.Vector3(0.0, 0.0, 0.0);
        this.rotation ={x : 0, y : 0, z : 0};
        this.color = {r : 1.0, g : 1.0, b : 1.0, a : 1.0};
        this.matcap = "";
        this.model = null;
        this.visible = true;
        this.instanceCount = 1.0;
        this.instances = [];

        this.state = null;

    }
}

class MapCue {
    constructor(){

        this.type = CueType.MAP;
        this.name = "";

        this.src = "";
        this.id = "";
        this.showGrid = false;
        this.gridScale = 1.0;
        this.gridOpacity = 0.75;
        this.lineThickness = 0.18;
        this.color = {r : 1.0, g : 1.0, b : 1.0, a : 1.0};
        this.texture = null;
        this.hexFadeDistance = 100.0;
        this.state = null;

    }
}

export {
    SoundCue,
    ModelCue,
    MapCue
};