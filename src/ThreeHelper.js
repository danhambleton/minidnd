import * as THREE from "three";
import { MeshMatcapMaterial, NearestMipMapLinearFilter, TetrahedronGeometry, Vector3 } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

class ThreeHelper {
    constructor () {

    }

    initScene(app)
    {
         //create threejs scene
         app.clientSize = new THREE.Vector2(app.playerContent.offsetWidth, app.playerContent.offsetHeight);
         app.gridScale = 0.25;
         app.gridOpacity = 0.75;
         app.imageSize = new THREE.Vector2(1920, 1080);
 
         //init threejs
         app.scene = new THREE.Scene();
 
         const light = new THREE.DirectionalLight( new THREE.Color(0.7, 0.7, 0.7), 1 );
         light.position.set( 0, 100, 0 );
         light.position.multiplyScalar( 1.3 );
         //light.lookAt(new Vector3(0.0, 0.0, 0.0));
 
         light.castShadow = true;
 
         light.shadow.mapSize.width = 1024;
         light.shadow.mapSize.height = 1024;
 
         const d = 10;
 
         light.shadow.camera.left = - d;
         light.shadow.camera.right = d;
         light.shadow.camera.top = d;
         light.shadow.camera.bottom = - d;
 
         light.shadow.camera.far = 200;
 
         app.scene.add(light);
 
         const near = 2;
         const far = 5;
         const color = 'black';
         app.scene.fog = new THREE.Fog(color, near, far);
         app.scene.background = new THREE.Color(color);
 
         const ambLight = new THREE.AmbientLight( 0x404040 ); // soft white light
         app.scene.add( ambLight );
 
 
         app.camera = new THREE.PerspectiveCamera(60, app.clientSize.x / app.clientSize.y, 0.1, 100);
         // app.camera = new THREE.OrthographicCamera(-5.0, 5.0, 2.5, -2.5, 0.0, 100.0);
         app.camera.name = "MainCamera";
         app.renderer = new THREE.WebGLRenderer({antialias: true});
         app.renderer.shadowMap.enabled = true;
         app.renderer.shadowMapSoft = true;
         app.renderer.gammaOutput = true;
         app.renderer.gammaFactor = 1.5;
         app.renderer.setSize(app.clientSize.x, app.clientSize.y);
        //  console.log("test renderer");
         app.playerContent.appendChild(app.renderer.domElement);
 
         //orbit controls
         app.controls = new MapControls(app.camera, app.renderer.domElement);
 
         app.controls.enableDamping = true;
         app.controls.dampingFactor = 0.05;
         app.controls.screenSpacePanning = false;
         app.controls.minDistance = 0.2;
         app.controls.maxDistance = 1.0;
         app.controls.maxPolarAngle = Math.PI / 6;
         app.controls.maxAzimuthAngle = 0.0;
         app.controls.minAzimuthAngle = 0.0;
         app.controls.zoomSpeed = 0.5;
 
         app.camera.position.set(0, 2, 0);
         app.camera.lookAt(0.0, 0.0, 0.0);
 
         app.controls.update();
 
         //hex grid plane
         app.debugParams = {
             p_grid_scale: 5.0,
             p_grid_alpha: 0.5,
             p_grid_spacing: 0.1,
             p_image_scale: 1.0,
             p_origin_x: 0.5,
             p_origin_y: 0.5,
             p_grid_rot_x: 0.0,
             p_grid_rot_y: 0.0,
             p_grid_rot_z: 0.0,
             p_grid_pos_y: 0.0,
         }
 
         app.shaderUniforms = {
             //baseMap: { type: "t", value: texture }, //fog texture??
             u_grid_scale: { value: app.gridScale },
             u_grid_alpha: { value: app.gridOpacity },
             u_grid_spacing: { value: app.debugParams.p_grid_spacing },
             u_image_dims: { value: app.imageSize },
             fogColor:    { type: "c", value: app.scene.fog.color },
             fogNear:     { type: "f", value: app.scene.fog.near },
             fogFar:      { type: "f", value: app.scene.fog.far }
         }
    }
}

export {
    ThreeHelper
};