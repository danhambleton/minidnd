import aws from "aws-sdk"
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import * as MapShaders from "./MapShaders.js";
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";

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

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(screenDims.x, screenDims.y);
        container.appendChild(renderer.domElement);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        function onMouseMove(event) {

            // calculate mouse position in normalized device coordinates
            // (-1 to +1) for both components

            // mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            // mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

            mouse.x = ((event.clientX - renderer.domElement.offsetLeft) / renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = - ((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;

            // update the picking ray with the camera and mouse position
            raycaster.setFromCamera(mouse, camera);

            //console.log(mouse);

            // calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(scene.children);

            if (intersects.length > 0) {
                for (let i = 0; i < intersects.length; i++) {

                    //intersects[ i ].object.material.color.set( 0xff0000 );
                    console.log(intersects[i].point);

                }
            }

            // const listener = new THREE.AudioListener();
            // camera.add(listener);

            // // create a global audio source
            // const sound = new THREE.Audio(listener);

            // // load a sound and set it as the Audio object's buffer
            // const audioLoader = new THREE.AudioLoader();
            // audioLoader.load('https://danbleton.nyc3.digitaloceanspaces.com/circle-of-fire-and-grace/SingingIce.mp3', function (buffer) {
            //     sound.setBuffer(buffer);
            //     sound.setLoop(true);
            //     sound.setVolume(0.5);



            //     const reverbLoader = new THREE.AudioLoader();



            //     // load impulse response from file
            //     reverbLoader.load("https://danbleton.nyc3.digitaloceanspaces.com/public/reverbs/Large%20Wide%20Echo%20Hall.wav", function (buffer) {

            //         let convolver = listener.context.createConvolver();

            //         console.log("we have convolver...")

            //         convolver.buffer = buffer;

            //         listener.setFilter(convolver);


            //         var stereoPanner = listener.context.createStereoPanner();

            //         stereoPanner.pan.setValueAtTime(-0.75, listener.context.currentTime);

            //         listener.setFilter(stereoPanner);


            //         sound.play();

            //     });

            // });
        }

        container.addEventListener('mousedown', onMouseMove, false);

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

                // const composer = new EffectComposer(renderer);
                // composer.addPass(new RenderPass(scene, camera));
                // composer.addPass(new EffectPass(camera, new BloomEffect()));

                // const clock = new THREE.Clock();

                // create an AudioListener and add it to the camera


                function animate() {

                    requestAnimationFrame(animate);

                    controls.update();




                    renderer.render(scene, camera);
                    // composer.render(clock.getDelta());

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