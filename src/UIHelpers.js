import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import * as Tweakpane from 'tweakpane'
import * as THREE from "three";
import { GroundStation } from "aws-sdk";

class UIHelpers {
    constructor() {

    }


    buildSoundInspector(app, id) {

        const cue = app.cueMap[id];

        console.log(cue);

        var name = document.createElement("h3");
        name.innerHTML = cue.name;
        app.inspector.appendChild(name);


        const gui =  new Tweakpane({
            container: app.inspector
          });

        gui.addInput(cue, "type");
        gui.addInput(cue, "src");
        gui.addInput(cue, "volume", {
            min: 0.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(cue, "loop");
        gui.addInput(cue, "pan", {
            min: -1.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(cue, "reverb", {
            min: 0.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(cue, "echo", {
            min: 0.0,
            max: 1.0,
            step: 0.01
        });
        gui.addInput(cue, "fade_in", {
            min: 0.0,
            max: 5.0,
            step: 0.01
        });
        gui.addInput(cue, "fade_out", {
            min: 0.0,
            max: 5.0,
            step: 0.01
        });


    }

    buildModelInspector(app, id) {

        const cue = app.cueMap[id];

        console.log(cue);


        var name = document.createElement("h3");
        name.innerHTML = cue.name;
        app.inspector.appendChild(name);

        const gui =  new Tweakpane({
            container: app.inspector
          });

        gui.addInput(cue, "type");
        gui.addInput(cue, "src");
        gui.addInput(cue, "scale", {
            min: 0.001,
            max: 10.0,
            step: 0.01
        });
        gui.addInput(cue, "position");
        gui.addInput(cue, "rotation");
        gui.addInput(cue, "color");
        gui.addInput(cue, "matcap");



    }

    buildMapInspector(app, id) {

        const cue = app.cueMap[id];

        console.log(cue);


        var name = document.createElement("h3");
        name.innerHTML = cue.name;
        app.inspector.appendChild(name);

        const gui =  new Tweakpane({
            container: app.inspector
          });

        gui.addInput(cue, "type");
        gui.addInput(cue, "src");
        gui.addInput(cue, "showGrid");
        gui.addInput(cue, "gridScale", {
            min: 0.001,
            max: 0.5,
            step: 0.01
        });
        gui.addInput(cue, "color");

    }
}

export {
    UIHelpers
};