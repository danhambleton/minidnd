import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import * as Tweakpane from 'tweakpane'
import * as THREE from "three";
import { GroundStation } from "aws-sdk";

class UIHelpers {
    constructor() {

    }


    buildSoundInspector(app, id) {

        const action = app.cueMap[id];

        console.log(action);

        const gui =  new Tweakpane({
            container: app.inspector
          });

        gui.addInput(action, "type");
        gui.addInput(action, "src");
        gui.addInput(action, "volume", {
            min: 0.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(action, "loop");
        gui.addInput(action, "pan", {
            min: -1.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(action, "reverb", {
            min: 0.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(action, "echo", {
            min: 0.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(action, "fade_in", {
            min: 0.0,
            max: 5.0,
            step: 0.01
        });
        gui.addInput(action, "fade_out", {
            min: 0.0,
            max: 5.0,
            step: 0.01
        });


    }

    buildModelInspector(app, id) {

        const action = app.cueMap[id];

        console.log(action);

        const gui =  new Tweakpane({
            container: app.inspector
          });

        gui.addInput(action, "type");
        gui.addInput(action, "src");
        gui.addInput(action, "scale", {
            min: 0.001,
            max: 10.0,
            step: 0.01
        });
        gui.addInput(action, "position");
        gui.addInput(action, "rotation");
        gui.addInput(action, "color");
        gui.addInput(action, "matcap");



    }

    buildMapInspector(app, id) {

        const action = app.cueMap[id];

        console.log(action);

        const gui =  new Tweakpane({
            container: app.inspector
          });

        gui.addInput(action, "type");
        gui.addInput(action, "src");
        gui.addInput(action, "showGrid");
        gui.addInput(action, "gridScale", {
            min: 0.001,
            max: 0.5,
            step: 0.01
        });
        gui.addInput(action, "color");

    }
}

export {
    UIHelpers
};