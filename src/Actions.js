import Peer, * as peer from "peerjs"
import * as Pizzicato from "pizzicato"
import * as THREE from "three";
import { MeshMatcapMaterial, NearestMipMapLinearFilter, TetrahedronGeometry, Vector3 } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as MapShaders from "./MapShaders.js";

class Actions {

    constructor() {

    }

    loadModel(app, params, callback)
    {
        // Instantiate a loader
        const loader = new GLTFLoader();

        // Optional: Provide a DRACOLoader instance to decode compressed mesh data
        // const dracoLoader = new DRACOLoader();
        // dracoLoader.setDecoderPath('/examples/js/libs/draco/');
        // loader.setDRACOLoader(dracoLoader);

        // Load a glTF resource
        loader.load(
            // resource URL
            params.src,
            // called when the resource is loaded
            function (gltf) {

                var bbox = new THREE.Box3().setFromObject(gltf.scene);

                var baseDim = Math.max(Math.abs(bbox.max.x - bbox.min.x), Math.abs(bbox.max.z - bbox.min.z));
                var scaleFactor = (10.0 * parseFloat(params.volume) / app.gridScale ) / (baseDim);
                gltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

                var matCapMaterial = null


                gltf.scene.traverse(function (object) {
                    if (object.isMesh) {

                        console.log(object.material);

                        if(object.material.name === "matcap")
                        {
                            if(!matCapMaterial)
                            {
                                matCapMaterial = new THREE.MeshMatcapMaterial({
                                    matcap: object.material.map,
                                    color: 0xa3a3a3
                                });
                            }

                        }

                        if(matCapMaterial)
                        {
                            object.material = matCapMaterial;
                        }

                        object.material.needsUpdate = true;
                        object.userData.root = gltf.scene.id;
                        object.castShadow = true;
                        object.receiveShadow = true;

                        
                    }
                    object.userData.isTransient = true;
                });

                gltf.scene.userData.isTransient = true;
                //gltf.scene.userData.owner = params.peerId;
                // gltf.scene.name = nanoid(10);

                // app.scene.add(gltf.scene);

                // app.camera.lookAt(gltf.scene.position);
                // app.controls.reset();

                // app.transients.push(gltf.scene);

                app.modelCache[params.src] = gltf.scene;

                callback();
            },
            // called while loading is progressing
            function (xhr) {

                var msg = (xhr.loaded / xhr.total * 100) + '% loaded';
                app.status.innerHTML = msg;
                console.log(msg);

            },
            // called when loading has errors
            function (error) {

                console.log('An error happened');

            }
        );
    }

    loadImage(app, params, callback)
    {
        // instantiate a loader
        var loader = new THREE.TextureLoader();

        // load a resource
        loader.load(

            params.src,

            // onLoad callback
            function (texture) {

                //TODO: do something here

                app.imageCache[params.src] = texture;

                callback();
            },

            // onProgress callback currently not supported
            undefined,

            // onError callback
            function (err) {
                console.error('An error happened. Matcap.');
            }
        );

    }

    loadSound(app, params, callback)
    {
        console.log("creating new audio at: " + params.src);

        let track = new Pizzicato.Sound({
            source: 'file',
            options: {
                path: params.src
            }
        }, function () {

            var stereoPanner = new Pizzicato.Effects.StereoPanner({
                pan: parseFloat(params.pan)
            });

            var reverb = new Pizzicato.Effects.Reverb({
                time: parseFloat(params.reverb),
                decay: 0.2,
                reverse: false,
                mix: 0.5
            });

            var pingPongDelay = new Pizzicato.Effects.PingPongDelay({
                feedback: 0.3,
                time: 0.5,
                mix: parseFloat(params.echo)
            });

            console.log('sound file loaded!');
            track.addEffect(stereoPanner);
            track.addEffect(reverb);
            track.addEffect(pingPongDelay);
            track.volume = parseFloat(params.volume);
            track.loop = parseFloat(params.loop) < 0.5 ? false : true;
            track.attack = parseFloat(params.fade_in);
            track.release = parseFloat(params.fade_out);

            app.audioCache[id] = params;
            app.audioCache[id].media = track;
            app.audioCache[id].effects[0] = stereoPanner;
            app.audioCache[id].effects[1] = reverb;
            app.audioCache[id].effects[2] = pingPongDelay;
            app.audioCache[id].content_state = "ready";

            //track stop
            app.audioCache[id].media.on("stop", function () {
                app.audioCache[id].content_state = "default";
            });

            // //handle special case where sound needs to load and then play 
            // if (params.ui_state === "selected") {
            //     app.audioMap[id].media.play();
            //     app.audioMap[id].content_state = "playing";
            // }

            callback();
        });
    }

    updateSound(app, params) {

    }

    addModelToScene(app, params)
    {
        var model = app.modeleCache[params.src];

        if(model) {
            var obj = model.clone();
            app.scene.add(obj);
            //other params
        }
        else {
            console.log("could not find model in cache: " + params.src);
        }
    }

    updateModelTransform(app, params)
    {
        var model = app.scene.getObjectByName(params.objectName);

        if(model) {
            //set model transform

        }
        else {
            console.log("could not find model in scene: " + params.objectName);
        }
    }

    sendActionToHost(app, action)
    {

    }

    sendActionToPeers(app, action)
    {

    }




}

export {
    Actions
};