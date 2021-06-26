import Peer, * as peer from "peerjs"
import * as Pizzicato from "pizzicato"
import * as THREE from "three";
import { BoxGeometry, Mesh, MeshBasicMaterial, MeshMatcapMaterial, NearestMipMapLinearFilter, OctahedronBufferGeometry, TetrahedronGeometry, Vector3 } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as MapShaders from "./MapShaders.js";
import { HexGrid } from "./HexGrid.js"
import { SoundCue, ModelCue, MapCue, CueState, CueType } from "./Cues.js"
import { PeerHelper } from "./PeerHelper.js"
import { nanoid } from 'nanoid'
import { IoTFleetHub } from "aws-sdk";


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

                var matCapMaterial = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(0.44, 0.44, 0.44)
                });
                

                gltf.scene.name = params.name;

                gltf.scene.traverse(function (object) {
                    if (object.isMesh) {

                        // if (object.material.name === "matcap") {
                        //     if (!matCapMaterial) {
                        //         matCapMaterial = new THREE.MeshMatcapMaterial({
                        //             matcap: object.material.map,
                        //             color: 0xa3a3a3
                        //         });
                        //     }

                        // }

                        if (matCapMaterial) {
                            object.material = matCapMaterial;
                        }

                        object.material.needsUpdate = true;
                        object.userData.root = gltf.scene.id;
                        object.castShadow = true;
                        object.receiveShadow = true;

                    }
                });

                callback(gltf.scene);
            },
            // called while loading is progressing
            function (xhr) {

                var msg = (xhr.loaded / xhr.total * 100) + '% loaded';
                app.status.innerHTML = msg;
                // console.log(msg);

            },
            // called when loading has errors
            function (error) {

                console.log('A model load error happened');

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

    loadSound(app, cue, callback) {
        console.log("creating new audio at: " + cue.src);

        let track = new Pizzicato.Sound({
            source: 'file',
            options: {
                path: cue.src
            }
        }, function () {

            var stereoPanner = new Pizzicato.Effects.StereoPanner({
                pan: cue.pan
            });

            var reverb = new Pizzicato.Effects.Reverb({
                time: cue.reverb,
                decay: 0.2,
                reverse: false,
                mix: 0.5
            });

            var pingPongDelay = new Pizzicato.Effects.PingPongDelay({
                feedback: 0.3,
                time: 0.5,
                mix: cue.echo
            });

            console.log(cue);

            console.log('sound file loaded!');
            track.addEffect(stereoPanner);
            track.addEffect(reverb);
            track.addEffect(pingPongDelay);
            track.volume = cue.volume;
            track.loop = cue.loop;
            track.attack = cue.fade_in;
            track.release = cue.fade_out;

            let id = cue.id;

            app.cueMap[id] = cue;
            app.cueMap[id].media = track;
            app.cueMap[id].effects[0] = stereoPanner;
            app.cueMap[id].effects[1] = reverb;
            app.cueMap[id].effects[2] = pingPongDelay;

            //track stop
            app.cueMap[id].media.on("stop", function () {
                app.cueMap[id].state = CueState.READY;
            });

            callback(id);
        });
    }

    updateSound(app, cue) {


        let id = cue.id;
        
        app.cueMap[id].media.volume = cue.volume;
        app.cueMap[id].media.attack = cue.fade_in;
        app.cueMap[id].media.release = cue.fade_out;
        app.cueMap[id].effects[0].pan = cue.pan;
        app.cueMap[id].effects[1].time = cue.reverb;
        app.cueMap[id].effects[2].mix = cue.echo;
        app.cueMap[id].loop = cue.loop;

    }

    addModelToScene(app, params) {

        var model = params.model;

        if (model) {

            var numInstances = 1;
            if(params.instanceCount)
            {
                numInstances = params.instanceCount;
            }

            var hexGrid = new HexGrid();
            var offsets = hexGrid.NeighbourOffsets();
            numInstances = Math.min(18, numInstances);
            for(var i = 0; i < numInstances; i++)
            {
                var obj = model.clone();
                // obj.scale.set(params.scale, params.scale, params.scale);
                this.scaleModelHexGrid(obj, params.scale, app.gridScale);
                obj.position.set(params.position.x, params.position.y, params.position.z);

                //snap to hex grid
                
                var sp = new THREE.Vector3(obj.position.x, obj.position.z, 0.0);
                var hexCenterInCubeCoords = hexGrid.HexRound(hexGrid.CoordToHex(sp, app.gridScale));

                var move = new THREE.Vector3(0.0, 0.0, 0.0);

                if(i > 0)
                {
                    move = offsets[i-1];
                }

                console.log(move);
        
                //move is a vec3 that increments the cube coords
                var newHexCenter = hexGrid.HexRound(hexCenterInCubeCoords);
                newHexCenter.x  = newHexCenter.x + move.x;
                newHexCenter.y  = newHexCenter.y + move.y;
                newHexCenter.z  = newHexCenter.z + move.z;
                var newPos = hexGrid.HexToCoord(newHexCenter, app.gridScale);
        
                obj.position.set(newPos.x, 0.0, newPos.y);
                
                obj.visible = params.visible;
                obj.userData.cueID = params.id;
                obj.name = params.id + "-" + i;

                var col = new THREE.Color(`rgb(${parseInt(params.color.r)}, ${parseInt(params.color.g)}, ${parseInt(params.color.b)})`);
                this.setMaterialColor(app, obj, { color: col });
    
                obj.traverse(function (object) {
                    if (object.isMesh) {
    
                        object.userData.root = obj.id;
                    }
                });
    
                app.scene.add(obj);
                app.transients.push(obj);
                //other params
            }

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

        if(app.playerTokenId && app.scene.getObjectByName(app.playerTokenId))
        {
            console.log("Token already added to scene!");
            return;
        }

        var tokenObj = app.profileModel.clone();
        tokenObj.position.set(0.0, 0.0, 0.0);
        var bbox = new THREE.Box3().setFromObject(tokenObj);

        var baseDim = Math.max(Math.abs(bbox.max.x - bbox.min.x), Math.abs(bbox.max.z - bbox.min.z));
        var scaleFactor = 1.75 * app.gridScale / baseDim;
        tokenObj.scale.set(scaleFactor, scaleFactor, scaleFactor);


        // var matCapMaterial = new THREE.MeshMatcapMaterial({
        //     matcap: app.matcaps.playerTokenMatcap,
        //     color: app.profileColor
        // });

        var matCapMaterial = new THREE.MeshLambertMaterial({
            color: app.profileColor,
        });


        console.log("token cloned:=");
        tokenObj.name = nanoid(10);

        app.playerTokenId = tokenObj.name;
        tokenObj.position.set(0.0, 0.0, 0.0);

        console.log("changing material colors");
        tokenObj.traverse(function (object) {
            if (object.isMesh) {

                object.material = matCapMaterial;
                object.material.needsUpdate = true;
                object.userData.root = tokenObj.id;
                object.castShadow = true; 
                object.receiveShadow = true;          
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
                            
                            // return true;
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

    setMaterialColor(app, obj, params)
    {
        obj.traverse(function (object) {
            if (object.isMesh) {


                // object.material = new THREE.MeshMatcapMaterial({
                //     matcap: app.matcaps.playerTokenMatcap,
                //     color: params.color
                // });

                object.material.color = params.color;

                object.material.needsUpdate = true;
                //object.userData.root = gltf.scene.id;
                object.castShadow = true;
                object.receiveShadow = true;

            }
        });
    }

    movePlayerToNextHex(app, move) {

        if(!app.scene.getObjectByName(app.playerTokenId))
        {
            console.log("Token not added to scene!");
            return;
        }

        var tokenObj = app.scene.getObjectByName(app.playerTokenId);
        var hexGrid = new HexGrid();
        var sp = new THREE.Vector3(tokenObj.position.x, tokenObj.position.z, 0.0);
        var hexCenterInCubeCoords = hexGrid.HexRound(hexGrid.CoordToHex(sp, app.gridScale));

        //move is a vec3 that increments the cube coords
        var newHexCenter = hexGrid.HexRound(hexCenterInCubeCoords);
        newHexCenter.x  = newHexCenter.x + move.x;
        newHexCenter.y  = newHexCenter.y + move.y;
        newHexCenter.z  = newHexCenter.z + move.z;
        var newPos = hexGrid.HexToCoord(newHexCenter, app.gridScale);

        tokenObj.position.set(newPos.x, 0.0, newPos.y);

        //update token position in shader
        if(app.gridObj)
        {
            app.shaderUniforms.u_token_position.value = tokenObj.position;
            app.shaderUniforms.u_hex_fade_distance.value = app.hexFadeDist;

            app.gridObj.material.uniforms = app.shaderUniforms;
            app.gridObj.material.needsUpdate = true;
        }

        var peerHelper = new PeerHelper();
        peerHelper.sendObjectTransfromToHost(app, tokenObj);
    }

    scaleModelHexGrid(obj, numHexes, gridScale)
    {
        var bbox = new THREE.Box3().setFromObject(obj);
        console.log("current scale: " + obj.scale.x);
        
        var dim = Math.max(bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z);
        console.log("base dim: " + dim);
        var scaleFactor = obj.scale.x * (2.0 * numHexes * gridScale) / dim;
        console.log("scale factor: " + scaleFactor);
        obj.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    sendActionToHost(app, action) {

    }

    removeTransients(app) {
        app.transformControl.detach();

        try {

            for (const obj of app.transients) {

                
                if(app.cueMap[obj.userData.cueID])
                {
                    app.cueMap[obj.userData.cueID] = null;
                }


                app.scene.remove(obj);
            }


        }
        catch (err) {

        }

        app.transients = [];
    }

    buildMapScene(app, params, callback) {
        this.removeTransients(app);

        this.loadImage(app, params, function (texture) {

            app.imageSize = new THREE.Vector2(texture.image.width, texture.image.height);
            var aspect = app.imageSize.y / app.imageSize.x;

            app.imageObj = new THREE.Mesh(
                new THREE.PlaneGeometry(app.mapWidth, aspect * app.mapWidth),
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

            app.controls.reset();

            app.camera.rotation.set(-Math.PI / 2, 0.0, 0.0);
            app.camera.position.set(0.0, app.cameraOffset, 0.0);
            app.camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));

            console.log("camera pos: " + app.camera.position.y);

            app.scene.remove(app.scene.getObjectByName("GridObj"));

            app.shaderUniforms.u_image_dims.value = app.imageSize;

            console.log(params);

            if (params.showGrid) {

                console.log("building grid obj...");

                app.gridScale = params.gridScale;
                app.gridOpacity = params.gridOpacity;
                app.hexFadeDist = params.hexFadeDistance;
                app.shaderUniforms.u_grid_spacing.value = params.lineThickness;
                app.shaderUniforms.u_grid_scale.value = app.gridScale
                app.shaderUniforms.u_grid_alpha.value = app.gridOpacity
                app.shaderUniforms.u_hex_fade_distance.value = app.hexFadeDist;
                app.shaderUniforms.u_token_position.value = new THREE.Vector3(0.0,0.0,0.0);

                app.gridObj = new THREE.Mesh(
                    new THREE.PlaneGeometry(app.mapWidth, aspect * app.mapWidth),
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

            callback();

        });
    }

    sendActionToPeers(app, action) {

    }
}

export {
    Actions
};