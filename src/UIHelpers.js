import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import * as Tweakpane from 'tweakpane'
import * as THREE from "three";
import { GroundStation } from "aws-sdk";
import { SoundCue, ModelCue, MapCue, CueState, CueType } from "./Cues.js"

class UIHelpers {
    constructor() {

    }

    sendCue (app, cue) {
        
        //send staged content to all connected peers
        for (const c of app.conn) {

            if (c && c.open) {

                c.send(cue);

            } else {
                console.log('Connection is closed');
            }
        }
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

        const btn = gui.addButton({
            title: 'DELETE'
          });

        btn.on('click', () => {
            console.log("deleting cue...: " + app.cueMap[id]);
            var b = document.getElementById(id);
            if(b)
            {
               b.className = "cueElementEmpty";
               b.innerHTML = "";
               b.style.background = "";
               this.sendCue(app, {type: CueType.DELETE, target: app.cueMap[id]});
               app.cueMap[id] = null;

               while (app.inspector.firstChild) {
                app.inspector.removeChild(app.inspector.firstChild);
            }
            }
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
        gui.addInput(cue, "visible");
        gui.addInput(cue, "color");
        gui.addInput(cue, "matcap");

        const btn = gui.addButton({
            title: 'DELETE'
          });

          btn.on('click', () => {
            console.log("deleting cue...: " + app.cueMap[id]);
            var b = document.getElementById(id);
            if(b)
            {
               b.className = "cueElementEmpty";
               b.innerHTML = "";
               b.style.background = "";
               this.sendCue(app, {type: CueType.DELETE, target: app.cueMap[id]});
               app.cueMap[id] = null;

               while (app.inspector.firstChild) {
                app.inspector.removeChild(app.inspector.firstChild);
            }
            }
        });


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
            max: 5.0,
            step: 0.01
        });
        gui.addInput(cue, "color");

        const btn = gui.addButton({
            title: 'DELETE'
          });

          btn.on('click', () => {
            console.log("deleting cue...: " + app.cueMap[id]);
            var b = document.getElementById(id);
            if(b)
            {
               b.className = "cueElementEmpty";
               b.innerHTML = "";
               b.style.background = "";
               this.sendCue(app, {type: CueType.DELETE, target: app.cueMap[id]});
               app.cueMap[id] = null;

               while (app.inspector.firstChild) {
                app.inspector.removeChild(app.inspector.firstChild);
            }
            }
        });

    }
}

export {
    UIHelpers
};