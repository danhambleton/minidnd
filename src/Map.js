import aws from "aws-sdk"
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import * as MapShaders from "./MapShaders.js";

class Map {

    /**
 * Constructor for a MediaStage
 * 
 * .
 * @param {*} s3

  */
    constructor(container) {

        //init s3 connection
        this.s3 = new aws.S3({
            endpoint: process.env.SPACES_ENDPOINT,
            accessKeyId: process.env.SPACES_ACCESS_KEY,
            secretAccessKey: process.env.SPACES_SECRET_KEY,
        });

        var screenDims = new THREE.Vector2(container.offsetWidth, container.offsetHeight);
        var origin = new THREE.Vector2(0.5, 0.5);
        var gridScale = 10.0;
        var imageScale = 1.0;
        var imageDims = new THREE.Vector2(1920, 1080);

        //init threejs
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, screenDims.x / screenDims.y, 0.1, 100);

        console.log(container.offsetWidth);

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(screenDims.x, screenDims.y);
        container.appendChild(renderer.domElement);

        // instantiate a loader
        const loader = new THREE.TextureLoader();

        // load a resource
        loader.load(
            // resource URL
            //'https://danbleton.nyc3.digitaloceanspaces.com/circle-of-fire-and-grace/beach_map.jpeg',
            'https://danbleton.nyc3.digitaloceanspaces.com/circle-of-fire-and-grace/lost_city.jpeg',

            // onLoad callback
            function (texture) {

                imageDims = new THREE.Vector2(texture.image.width, texture.image.height);
                var aspect = imageDims.y / imageDims.x;

                var imgQuad = new THREE.Mesh(
                    new THREE.PlaneGeometry(10.0, aspect * 10.0),
                    new THREE.MeshBasicMaterial({
                        map: texture
                    })
                );
                scene.add(imgQuad);

                var params = {
                    p_grid_scale: 100.0,
                    p_image_scale: 1.0,
                    p_origin_x: 0.5,
                    p_origin_y: 0.5,
                    p_grid_rot_x: 0.0,
                    p_grid_rot_y: 0.0,
                    p_grid_rot_z: 0.0,
                    p_grid_pos_y: 0.0,
                }

                var mapUniforms = {
                    baseMap: { type: "t", value: texture }, //fog texture??
                    u_grid_scale: { value: gridScale },
                    u_image_scale: { value: imageScale },
                    u_origin: { value: origin },
                    u_image_dims: { value: imageDims },
                    u_screen_dims: { value: screenDims }
                }

                var hexQuad = new THREE.Mesh(
                    new THREE.PlaneGeometry(100.0, aspect * 100.0),
                    new THREE.ShaderMaterial({
                        vertexShader: MapShaders.buildMapVertexShader(),
                        fragmentShader: MapShaders.buildMapFragmentShader(),
                        depthWrite: false,
                        depthTest: false,
                        blending: THREE.AdditiveBlending,
                        uniforms: mapUniforms
                    })
                );
                hexQuad.position.set(0.0, 0.0, 0.001);
                scene.add(hexQuad);

                const controls = new OrbitControls(camera, renderer.domElement);

                camera.position.set(0, 0, 5);
                controls.update();

                const gui = new GUI()
                const mapFolder = gui.addFolder("Map Controls")
                mapFolder.add(params, "p_image_scale").min(0.001).max(1.0).step(0.001).onChange(function () {
                    mapUniforms.u_image_scale.value = params.p_image_scale;
                    renderer.render(scene, camera);
                });
                mapFolder.add(params, "p_grid_scale").min(100).max(1000.0).step(0.001).onChange(function () {
                    mapUniforms.u_grid_scale.value = params.p_grid_scale;
                    renderer.render(scene, camera);
                });
                mapFolder.add(params, "p_origin_x").min(0.0).max(1.0).step(0.001).onChange(function () {
                    mapUniforms.u_origin.value.x = params.p_origin_x;
                    renderer.render(scene, camera);
                });
                mapFolder.add(params, "p_origin_y").min(0.0).max(1.0).step(0.001).onChange(function () {
                    mapUniforms.u_origin.value.y = params.p_origin_y;
                    renderer.render(scene, camera);
                });

                mapFolder.add(params, "p_grid_rot_x").min(-3.0).max(3.0).step(0.001).onChange(function () {
                    hexQuad.rotation.set(params.p_grid_rot_x, params.p_grid_rot_y, params.p_grid_rot_z);
                    renderer.render(scene, camera);
                });
                // mapFolder.add(params, "p_grid_rot_y").min(-1.0).max(1.0).step(0.001).onChange(function () {
                //     hexQuad.rotation.set(params.p_grid_rot_x, params.p_grid_rot_y, params.p_grid_rot_z);
                //     renderer.render(scene, camera);
                // });
                mapFolder.add(params, "p_grid_pos_y").min(-10.0).max(10.0).step(0.001).onChange(function () {
                    hexQuad.position.setY(params.p_grid_pos_y);
                    renderer.render(scene, camera);
                });
                mapFolder.add(params, "p_grid_rot_z").min(-3.0).max(3.0).step(0.001).onChange(function () {
                    hexQuad.rotation.set(params.p_grid_rot_x, params.p_grid_rot_y, params.p_grid_rot_z);
                    renderer.render(scene, camera);
                });

                mapFolder.open()

                //container.appendChild(gui.domElement);

                function animate() {

                    requestAnimationFrame(animate);

                    // cube.rotation.x += 0.005;
                    // cube.rotation.y += 0.01;

                    controls.update();

                    renderer.render(scene, camera);

                }

                animate();

            },

            // onProgress callback currently not supported
            undefined,

            // onError callback
            function (err) {
                console.error('An error happened.');
            }
        );




    }

    async LoadFromServer(path, callback) {
        // Add a file to a Space
        var params = {
            Bucket: process.env.SPACES_BUCKET,
            Key: path + "/manifest.json",

        };

        s3.getObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {

                var newContent = JSON.parse(data.Body);

                this.SetContent(newContent);

                console.log(stagedContent);

                callback();
            }
        });
    }



}



export {
    Map

};