import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import * as Tweakpane from 'tweakpane'
import * as THREE from "three";
import { GroundStation } from "aws-sdk";
import { SoundCue, ModelCue, MapCue, CueState, CueType } from "./Cues.js"
import { Actions } from "./Actions.js"

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

    buildProfileOptions(app) { 

        const gui =  new Tweakpane({
            // container: app.playerContent
          });

          const f1 = gui.addFolder({
            title: 'Settings',
          });

        f1.addInput(app, "profileName");
        var src = f1.addInput(app, "profileModelSrc" , {
            options : app.profileModelOptions
        });
        var col = f1.addInput(app, "profileColorParams");
        col.on("change", () => {
            app.profileColor = new THREE.Color(`rgb(${parseInt(app.profileColorParams.r)}, ${parseInt(app.profileColorParams.g)}, ${parseInt(app.profileColorParams.b)})`);
            var actions = new Actions();
            var newTokenObj = app.scene.getObjectById(app.playerTokenId);
            if(newTokenObj) {
                actions.setMaterialColor(app, newTokenObj, {color : app.profileColor});
            }

        });

        src.on("change", () => {

            // console.log(app.profileName);
            // console.log(app.profileModelOptions);
            // console.log(app.profileColor);


            var actions = new Actions();
            actions.loadModel(app, {src : app.profileModelSrc}, function(model) {

                app.profileModel = model;

                var tokenObj = app.scene.getObjectByName(app.playerTokenId);
                if(tokenObj) {

                    var pos = tokenObj.position;
                    var rot = tokenObj.rotation;
                    var scale = tokenObj.scale;
                    app.scene.remove(tokenObj);
                    actions.addPlayerTokenToScene(app, null, function(id) {

                        app.scene.getObjectByName(id).userData.reload = true;

                    });

                }

            });
        });
    }


    buildSoundInspector(app, id, save) {

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

        gui.on("change", () => {
            save(JSON.stringify(app.cueMap));
        })



    }

    buildModelInspector(app, id, save) {

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
        gui.addInput(cue, "instanceCount");
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

        gui.on("change", () => {
            save(JSON.stringify(app.cueMap));
        })



    }

    buildMapInspector(app, id, save) {

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
        gui.addInput(cue, "hexFadeDistance", {
            min: 0.0,
            max: 200.0,
            step: 1.0
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

        gui.on("change", () => {
            save(JSON.stringify(app.cueMap));
        })


    }
}

export {
    UIHelpers
};