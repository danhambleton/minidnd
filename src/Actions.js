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
                gltf.scene.userData.owner = params.peerId;
                gltf.scene.name = nanoid(10);

                app.scene.add(gltf.scene);

                app.camera.lookAt(gltf.scene.position);
                app.controls.reset();

                app.transients.push(gltf.scene);

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

    }

    loadSound(app, params, callback)
    {

    }

    addModelToScene(app, params)
    {

    }

    updateModelTransform(app, params)
    {

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