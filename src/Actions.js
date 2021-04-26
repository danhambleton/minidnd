import Peer, * as peer from "peerjs"
import * as Pizzicato from "pizzicato"
import * as THREE from "three";
import { BoxGeometry, Mesh, MeshBasicMaterial, MeshMatcapMaterial, NearestMipMapLinearFilter, TetrahedronGeometry, Vector3 } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as MapShaders from "./MapShaders.js";
import { HexGrid } from "./HexGrid.js"


class Actions {

    constructor() {

    }

    loadModel(app, params, callback) {
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

                // var bbox = new THREE.Box3().setFromObject(gltf.scene);

                // var baseDim = Math.max(Math.abs(bbox.max.x - bbox.min.x), Math.abs(bbox.max.z - bbox.min.z));
                // var scaleFactor = (10.0 * parseFloat(params.volume) / app.gridScale) / (baseDim);
                // gltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

                var matCapMaterial = null;


               

                gltf.scene.traverse(function (object) {
                    if (object.isMesh) {

                        if (object.material.name === "matcap") {
                            if (!matCapMaterial) {
                                matCapMaterial = new THREE.MeshMatcapMaterial({
                                    matcap: object.material.map,
                                    color: 0xa3a3a3
                                });
                            }

                        }

                        if (matCapMaterial) {
                            object.material = matCapMaterial;
                        }

                        object.material.needsUpdate = true;
                        object.userData.root = gltf.scene.id;
                        object.castShadow = true;
                        object.receiveShadow = true;

                    }
                });

                app.modelCache[params.src] = gltf.scene;
                callback(params.src);
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

    loadImage(app, params, callback) {
        // instantiate a loader
        var loader = new THREE.TextureLoader();

        // load a resource
        loader.load(

            params.src,

            // onLoad callback
            function (texture) {

                //TODO: do something here

                app.imageCache[params.src] = texture;

                callback(texture);
            },

            // onProgress callback currently not supported
            undefined,

            // onError callback
            function (err) {
                console.error('An error happened in image load.');
            }
        );

    }

    loadSound(app, params, callback) {
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

        var id = params.id;
        
        app.audioMap[id].media.volume = parseFloat(params.volume);
        app.audioMap[id].media.attack = parseFloat(params.fade_in);
        app.audioMap[id].media.release = parseFloat(params.fade_out);
        app.audioMap[id].effects[0].pan = parseFloat(params.pan);
        app.audioMap[id].effects[1].time = parseFloat(params.reverb);
        app.audioMap[id].effects[2].mix = parseFloat(params.echo);
        app.audioMap[id].loop = parseFloat(params.loop) < 0.5 ? false : true;

        if (app.audioMap[id].content_state !== "playing") {
            app.audioMap[id].media.play();
            app.audioMap[id].content_state = "playing";
        }

    }

    addModelToScene(app, params) {
        var model = app.modeleCache[params.src];

        if (model) {
            var obj = model.clone();
            app.scene.add(obj);
            //other params
        }
        else {
            console.log("could not find model in cache: " + params.src);
        }
    }

    addPlayerTokenToScene(app, params, callback) {

        if(!app.profileModel) {
            console.log("profile model not set!");
            return;
        }

        if(app.scene.getObjectByName(app.peer.id))
        {
            console.log("Token already added to scene!");
            return;
        }

        var tokenObj = app.profileModel.clone();
        tokenObj.position.set(0.0, 0.0, 0.0);
        var bbox = new THREE.Box3().setFromObject(tokenObj);

        var baseDim = Math.max(Math.abs(bbox.max.x - bbox.min.x), Math.abs(bbox.max.z - bbox.min.z));
        var scaleFactor = app.gridScale / baseDim;
        tokenObj.scale.set(scaleFactor, scaleFactor, scaleFactor);

        var col = new THREE.Color(
            "#" + app.profileColor
        );

        var matCapMaterial = new THREE.MeshMatcapMaterial({
            matcap: app.matcaps.playerTokenMatcap,
            color: col
        });


        console.log("token cloned:=");
        tokenObj.name = app.peer.id;
        tokenObj.position.set(0.0, 0.0, 0.0);

        console.log("changing material colors");
        tokenObj.traverse(function (object) {
            if (object.isMesh) {

                object.material = matCapMaterial;
                object.material.needsUpdate = true;
                object.userData.root = tokenObj.id;
                object.castShadow = true;           
            }
        });

        app.transients.push(tokenObj);
        // tokenObj.userData.isTransient = true;
        console.log("token adding to scene");
        app.scene.add(tokenObj);

        callback(tokenObj.id);
    }

    updateModelTransform(app, params) {
        var model = app.scene.getObjectByName(params.objectName);

        if (model) {
            //set model transform

        }
        else {
            console.log("could not find model in scene: " + params.objectName);
        }
    }

    pickObjectInScene(app, hit){

        var raycaster = new THREE.Raycaster();

        // update the picking ray with the camera and screenPoint position
        raycaster.setFromCamera(app.mousePosition, app.camera);

        var s = new THREE.Vector2(1.0, 1.7320508);

        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(app.scene.children, true);

        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {

                console.log(intersects[i].object.name);

                if (intersects[i].object.name === "ImageObj" || intersects[i].object.name === "GridObj") {

                    //app.scene.remove(app.transformControl);
                    continue;
                }

                if (intersects[i].object.isMesh) {
                    if (intersects[i].object.userData.root) {
                        var rootObj = app.scene.getObjectById(intersects[i].object.userData.root);
                        if (rootObj) {
                            //otherwise attach the transform control
                            app.scene.remove(app.transformControl);
                            app.transformControl.attach(rootObj);
                            app.scene.add(app.transformControl);

                            app.activeObj = rootObj;
                            app.activeObj.name = rootObj.name;

                            console.log("active obj: " + rootObj.name);

                            hit = intersects[i];
                            
                            return true;
                        }
                    }
                }
            }
        }
        else{
            app.scene.remove(app.transformControl);
        }

        return false;
    }

    pickHexGridPoint(app, callback) {

        var raycaster = new THREE.Raycaster();

        // update the picking ray with the camera and screenPoint position
        raycaster.setFromCamera(app.mousePosition, app.camera);
        
        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(app.scene.children);

        var validHit = false;
        var hp = new THREE.Vector3(0.0, 0.0, 0.0);

        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {

                //TODO: place token
                if (intersects[i].object.name === "GridObj") {
                    var np = intersects[i].point;
                    var hg = new HexGrid();
                    hp = hg.HexCenterFromPoint(new THREE.Vector3(np.x, np.z, 0.0), app.gridScale);

                    callback(hp);

                }
            }
        }
    }

    sendActionToHost(app, action) {

    }

    removeTransients(app) {
        app.transformControl.detach();

        try {

            for (const obj of app.transients) {
                app.scene.remove(obj);
            }


        }
        catch (err) {

        }

        app.transients = [];
    }

    buildMapScene(app, params) {
        this.removeTransients(app);

        this.loadImage(app, params, function (texture) {

            app.imageSize = new THREE.Vector2(texture.image.width, texture.image.height);
            var aspect = app.imageSize.y / app.imageSize.x;

            app.imageObj = new THREE.Mesh(
                new THREE.PlaneGeometry(10.0, aspect * 10.0),
                new THREE.MeshLambertMaterial({
                    map: texture,
                    depthTest: true,
                    depthWrite: true
                })
            );

            app.transients.push(app.imageObj);

            app.imageObj.name = "ImageObj";
            app.imageObj.position.setZ(0.0);
            app.imageObj.rotation.set(-Math.PI / 2, 0.0, 0.0);
            app.imageObj.receiveShadow = true;
            app.scene.add(app.imageObj);

            app.camera.rotation.set(-Math.PI / 2, 0.0, 0.0);
            app.camera.position.set(0.0, 3.0, 0.0);
            app.camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));

            app.controls.reset();

            app.scene.remove(app.scene.getObjectByName("GridObj"));

            app.shaderUniforms.u_image_dims.value = app.imageSize;

            console.log(params);

            if (parseFloat(params.loop) > 0.5) {

                console.log("building grid obj...");

                app.gridScale = parseFloat(params.volume);
                app.gridOpacity = parseFloat(params.reverb);
                app.shaderUniforms.u_grid_spacing.value = parseFloat(params.echo);
                app.shaderUniforms.u_grid_scale.value = app.gridScale
                app.shaderUniforms.u_grid_alpha.value = app.gridOpacity

                app.gridObj = new THREE.Mesh(
                    new THREE.PlaneGeometry(10.0, aspect * 10.0),
                    new THREE.ShaderMaterial({
                        vertexShader: MapShaders.buildMapVertexShader(),
                        fragmentShader: MapShaders.buildMapFragmentShader(),
                        blending: THREE.NormalBlending,
                        transparent: true,
                        uniforms: app.shaderUniforms,
                        fog: true
                    })
                );
                app.transients.push(app.gridObj);

                app.gridObj.position.set(0.0, 0.01, 0.0);
                app.gridObj.name = "GridObj";
                app.gridObj.rotation.set(-Math.PI / 2, 0.0, 0.0);

                app.gridObj.receiveShadow = true;

                app.scene.add(app.gridObj);
            }

            app.renderer.render(app.scene, app.camera);

        });
    }

    sendActionToPeers(app, action) {

    }
}

export {
    Actions
};