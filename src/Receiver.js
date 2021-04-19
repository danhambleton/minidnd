import * as L from "leaflet"
import Peer, * as peer from "peerjs"
import * as Pizzicato from "pizzicato"
import * as THREE from "three";
import { NearestMipMapLinearFilter, TetrahedronGeometry } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import * as MapShaders from "./MapShaders.js";

main();

function main() {

    let app = {

        //Threejs
        renderer: null,
        camera: null,
        scene: null,
        controls: null,
        mousePosition: new THREE.Vector2(0.5, 0.5),

        //peerjs 
        peer: null,
        connection: null,
        peerId: null,
        lastPeerId: null,

        //app specific
        audioMap: {},
        imageMap: {},
        imageObj: null,
        gridObj: null,
        gridScale: 200.0,
        gridOpacity: 0.75,
        imageSize: new THREE.Vector2(1920, 1080),
        clientSize: null,
        profileColor: Math.floor(Math.random()*16777215).toString(16),

        //ui
        recvId: document.getElementById("receiver-id"),
        status: document.getElementById("status"),
        message: document.getElementById("message"),
        sendMessageBox: document.getElementById("sendMessageBox"),
        sendButton: document.getElementById("sendButton"),
        clearMsgsButton: document.getElementById("clearMsgsButton"),
        recvIdInput: document.getElementById("host-id"),
        connectButton: document.getElementById("connect-button"),
        playerContent: document.getElementById("playerContent")

    };

    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */



    function getUrlParam(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href);
        if (results == null)
            return null;
        else
            return results[1];
    };


    function LoadSound(id, params) {

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

            app.audioMap[id] = params;
            app.audioMap[id].media = track;
            app.audioMap[id].effects[0] = stereoPanner;
            app.audioMap[id].effects[1] = reverb;
            app.audioMap[id].effects[2] = pingPongDelay;
            app.audioMap[id].content_state = "ready";

            //track stop
            app.audioMap[id].media.on("stop", function () {
                app.audioMap[id].content_state = "default";
            });

            //handle special case where sound needs to load and then play 
            if (params.ui_state === "selected") {
                app.audioMap[id].media.play();
                app.audioMap[id].content_state = "playing";
            }
        });
    }

    function LoadImage(id, params) {
        // instantiate a loader
        var loader = new THREE.TextureLoader();

        console.log("loading image...");

        // load a resource
        loader.load(
            // resource URL
            //'https://danbleton.nyc3.digitaloceanspaces.com/circle-of-fire-and-grace/douganshole.jpg',

            params.src,

            // onLoad callback
            function (texture) {

                app.scene.remove(app.scene.getObjectByName("ImageObj"));

                app.imageSize = new THREE.Vector2(texture.image.width, texture.image.height);
                var aspect = app.imageSize.y / app.imageSize.x;

                app.imageObj = new THREE.Mesh(
                    new THREE.PlaneGeometry(10.0, aspect * 10.0),
                    new THREE.MeshBasicMaterial({
                        map: texture,
                        depthTest: true,
                        depthWrite: true
                    })
                );

                app.imageObj.name = "ImageObj";
                app.imageObj.position.setZ(0.0);
                app.imageObj.rotation.set(-Math.PI/2, 0.0, 0.0);
                app.scene.add(app.imageObj);

                app.scene.remove(app.scene.getObjectByName("GridObj"));

                app.shaderUniforms.u_image_dims.value = app.imageSize;

                app.gridObj = new THREE.Mesh(
                    new THREE.PlaneGeometry(10.0, aspect * 10.0),
                    new THREE.ShaderMaterial({
                        vertexShader: MapShaders.buildMapVertexShader(),
                        fragmentShader: MapShaders.buildMapFragmentShader(),
                        blending: THREE.NormalBlending,
                        transparent: true,
                        uniforms: app.shaderUniforms
                    })
                );
                app.gridObj.position.set(0.0, 0.01, 0.0);
                app.gridObj.name = "GridObj";
                app.gridObj.rotation.set(-Math.PI/2, 0.0, 0.0);
                app.scene.add(app.gridObj);

                //recenter camera
                app.camera.position.set(0, 2, 0);

                app.renderer.render(app.scene, app.camera);
            },

            // onProgress callback currently not supported
            undefined,

            // onError callback
            function (err) {
                console.error('An error happened.');
            }
        );
    }

    function getHex(p) {

        var s = new THREE.Vector2(1.0, 1.7320508);

        var aspect = app.imageSize.y / app.imageSize.x;
        var uv = new THREE.Vector2(-5.0 + 10.0 * p.x, aspect * (-5.0 + 10.0 * p.y));

        //u_grid_scale * u + s.yx / 2.
        //var sp = new THREE.Vector2(app.gridScale * uv.x + s.y * 0.5, app.gridScale * uv.y + s.x * 0.5);
        var sp = new THREE.Vector2(app.gridScale * uv.x, app.gridScale * uv.y);

        // vec4 hC = floor(vec4(p, p - vec2(.5, 1)) / s.xyxy) + .5;  
        var hcx = Math.floor(sp.x / s.x) + 0.5;
        var hcy = Math.floor(sp.y / s.y) + 0.5;
        var hcz = Math.floor((sp.x - 0.5) / s.x) + 0.5;
        var hcw = Math.floor((sp.y - 1.0) / s.y) + 0.5;

        var hC = new THREE.Vector4(hcx, hcy, hcz, hcw);

        // Centering the coordinates- with the hexagon centers above.
        //var h = vec4(p - hC.xy * s, p - (hC.zw + .5) * s);
        var h = new THREE.Vector4(
            sp.x - hC.x * s.x,
            sp.y - hC.y * s.y,
            sp.x - (hC.z + 0.5) * s.x,
            sp.y - (hC.w + 0.5) * s.y
        );


        var h1 = new THREE.Vector2(h.x, h.y);
        var h2 = new THREE.Vector2(h.z, h.w);

        if (h1.lengthSq() < h2.lengthSq()) {
            return new THREE.Vector4(h.x, h.y, hC.x, hC.y);
        }
        else {
            return new THREE.Vector4(h.z, h.w, hC.z + 0.5, hC.w + 0.5);
        }

        //   return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + .5);
    }

    function PlacePeerToken(id, params) {

        var r = 0.3 / app.gridScale;

        console.log(params);

        var paramsObj = JSON.parse(params);

        var np = new THREE.Vector3(
            paramsObj.position.x,
            paramsObj.position.y,
            paramsObj.position.z
            );

        var peerColor = new THREE.Color(
            "#" + paramsObj.color
        );

        var tokenObj = app.scene.getObjectByName(paramsObj.peer);

        if (!tokenObj) {
            console.log("creating token object: " + paramsObj.peer);
            //instantiate this peers object
            tokenObj = new THREE.Mesh(
                new THREE.SphereGeometry(r, 32, 32),
                new THREE.MeshBasicMaterial({
                    // map: texture
                    color: peerColor
                })
            );
            tokenObj.name = paramsObj.peer;
            tokenObj.position.set(np.x, np.y, np.z);
            app.scene.add(tokenObj);
        }
        else {
            //console.log("have token object");
            console.log("updating token object: " + paramsObj.peer);
            tokenObj.position.set(np.x, np.y, np.z);
        }

        app.renderer.render(app.scene, app.camera);

    }

    function PlaceToken(id, params, event) {

        //var screenPoint = new THREE.Vector2(0,0);
        app.mousePosition.x = ((event.clientX - app.renderer.domElement.offsetLeft) / app.renderer.domElement.clientWidth) * 2 - 1;
        app.mousePosition.y = - ((event.clientY - app.renderer.domElement.offsetTop) / app.renderer.domElement.clientHeight) * 2 + 1;

        var raycaster = new THREE.Raycaster();

        // update the picking ray with the camera and screenPoint position
        raycaster.setFromCamera(app.mousePosition, app.camera);

        var s = new THREE.Vector2(1.0, 1.7320508);

        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(app.scene.children);

        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {

                //TODO: place token
                if (intersects[i].object.name === "GridObj") {
                    // console.log(intersects[i].point);
                    // console.log(intersects[i].uv);

                    //TODO: snap to hex grid and calc radius
                    //var p = intersects[i].uv;
                    var r = 0.3 / app.gridScale;

                    var aspect = app.imageSize.y / app.imageSize.x;
                    var offset = new THREE.Vector3(5.0, aspect * 5.0, 0.0);

                    console.log(offset.x + " " + offset.y);

                    // var hP = getHex(p);//getHex(new THREE.Vector2(intersects[i].point.x, intersects[i].point.y));
                    // var scale = 1.0;
                    // var np = new THREE.Vector3(scale * hP.z, scale * hP.w, 0.001);//.sub(offset);
                    // // np.x += app.debugParams.p_origin_x;
                    // // np.y += app.debugParams.p_origin_y;
                    // console.log("hex p: " + np.x + " " + np.y);

                    var np = intersects[i].point;

                    var tokenObj = app.scene.getObjectByName(app.peerId);

                    if (!tokenObj) {
                        console.log("creating token object");
                        //instantiate this peers object
                        tokenObj = new THREE.Mesh(
                            new THREE.SphereGeometry(r, 32, 32),
                            new THREE.MeshBasicMaterial({
                                // map: texture
                                color: new THREE.Color("#" + app.profileColor)
                            })
                        );
                        tokenObj.name = app.peerId;
                        tokenObj.position.set(np.x, np.y, np.z);
                        app.scene.add(tokenObj);
                    }
                    else {
                        //console.log("have token object");
                        tokenObj.position.set(np.x, np.y, np.z);
                    }

                    //send message to host
                    if (app.connection && app.connection.open) {

                        var tokenParams = {
                            peer: app.peer.id,
                            position: np,
                            color: app.profileColor
                        }

                        var cue = {
                            type: "token",
                            body: JSON.stringify(tokenParams)
                        }

                        app.connection.send(cue);
                    }
                }
            }
        }

    }

    function UpdateSound(id, params) {

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

    function initialize() {

        // Create own peer object with connection to shared PeerJS server
        app.peer = new Peer(null, {
            host: process.env.PEERJS_SERVER,
            path: '/',
            secure: true,
            debug: 2
        });

        app.peer.on('open', function (id) {
            // Workaround for peer.reconnect deleting previous id
            if (app.peer.id === null) {
                console.log('Received null id from peer open');
                app.peer.id = app.lastPeerId;
            } else {
                app.lastPeerId = app.peer.id;
            }

            console.log('ID: ' + app.peer.id);
            app.recvId.innerHTML = "ID: " + app.peer.id;
            app.status.innerHTML = "Awaiting connection...";
        });
        app.peer.on('connection', function (c) {

            // Allow only a single connection
            if (app.connection && app.connection.open) {
                c.on('open', function () {
                    c.send("Already connected to another client");
                    setTimeout(function () { c.close(); }, 500);
                });
                return;
            }

            app.connection = c;
            console.log("Connected to: " + app.connection.peer);
            app.status.innerHTML = "Connected";
            ready();

        });
        app.peer.on('disconnected', function () {
            app.status.innerHTML = "Connection lost. Please reconnect";
            console.log('Connection lost. Please reconnect');

            // Workaround for peer.reconnect deleting previous id
            app.peer.id = app.lastPeerId;
            app.peer._lastServerId = app.lastPeerId;
            app.peer.reconnect();
        });
        app.peer.on('close', function () {
            app.connection = null;
            app.status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        app.peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
        });

        //create threejs scene
        app.clientSize = new THREE.Vector2(app.playerContent.offsetWidth, app.playerContent.offsetHeight);
        app.gridScale = 5.0;
        app.gridOpacity = 0.55;
        app.imageSize = new THREE.Vector2(1920, 1080);

        //init threejs
        app.scene = new THREE.Scene();

        const near = 2;
        const far = 5;
        const color = 'black';
        app.scene.fog = new THREE.Fog(color, near, far);
        app.scene.background = new THREE.Color(color);


        app.camera = new THREE.PerspectiveCamera(75, app.clientSize.x / app.clientSize.y, 0.1, 100);
        // app.camera = new THREE.OrthographicCamera(-5.0, 5.0, 2.5, -2.5, 0.0, 100.0);
        app.renderer = new THREE.WebGLRenderer();
        app.renderer.setSize(app.clientSize.x, app.clientSize.y);
        app.playerContent.appendChild(app.renderer.domElement);

        //orbit controls
        app.controls = new MapControls(app.camera, app.renderer.domElement);

        app.controls.enableDamping = true;
        app.controls.dampingFactor = 0.05;
        app.controls.screenSpacePanning = false;
        app.controls.minDistance = 1.0;
        app.controls.maxDistance = 10.0;
        app.controls.maxPolarAngle = Math.PI / 4;

        app.camera.position.set(0, 2, 0);
        app.camera.lookAt(0.0, 0.0, 0.0);


        app.controls.update();

        //image plane
        var aspect = app.imageSize.y / app.imageSize.x;

        // app.imageSize = new THREE.Vector2(texture.image.width, texture.image.height);
        // var aspect = app.imageSize.y / app.imageSize.x;

        app.imageObj = new THREE.Mesh(
            new THREE.PlaneGeometry(10.0, aspect * 10.0),
            new THREE.MeshBasicMaterial({
                // map: texture
                depthTest: true,
                depthWrite: true
            })
        );
        app.imageObj.name = "ImageObj";
        app.imageObj.rotation.set(-Math.PI / 2, 0.0, 0.0);
        app.scene.add(app.imageObj);


        //hex grid plane
        app.debugParams = {
            p_grid_scale: 5.0,
            p_grid_alpha: 0.5,
            p_grid_spacing: 0.47,
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
        }

        app.gridObj = new THREE.Mesh(
            new THREE.PlaneGeometry(10.0, aspect * 10.0),
            new THREE.ShaderMaterial({
                vertexShader: MapShaders.buildMapVertexShader(),
                fragmentShader: MapShaders.buildMapFragmentShader(),
                blending: THREE.NormalBlending,
                transparent: true,
                uniforms: app.shaderUniforms
            })
        );
        app.gridObj.position.set(0.0, 0.01, 0.0);
        app.gridObj.rotation.set(-Math.PI / 2, 0.0, 0.0);
        app.gridObj.name = "GridObj";
        app.scene.add(app.gridObj);



        function resizeRendererToDisplaySize() {
            const canvas = app.renderer.domElement;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const needResize = canvas.width !== width || canvas.height !== height;
            if (needResize) {
                app.renderer.setSize(width, height, false);
            }
            return needResize;
          }
        
          function render() {
            if (resizeRendererToDisplaySize()) {
              const canvas = app.renderer.domElement;
              app.camera.aspect = canvas.clientWidth / canvas.clientHeight;
              app.camera.updateProjectionMatrix();
            }
        
            app.renderer.render(app.scene, app.camera);
          }
          render();
        
          app.controls.addEventListener('change', render);
          window.addEventListener('resize', render);

        //   const gui = new GUI()
        //   const mapFolder = gui.addFolder("Map Controls")
        //   mapFolder.add(app.debugParams, "p_grid_scale").min(0.001).max(20.0).step(0.001).onChange(function () {
        //       app.shaderUniforms.u_grid_scale.value = app.debugParams.p_grid_scale;
        //       app.renderer.render(app.scene, app.camera);
        //   });
        //   mapFolder.add(app.debugParams, "p_grid_alpha").min(0.0).max(2.0).step(0.001).onChange(function () {
        //     app.shaderUniforms.u_grid_alpha.value = app.debugParams.p_grid_alpha;
        //       app.renderer.render(app.scene, app.camera);
        //   });
        //   mapFolder.add(app.debugParams, "p_grid_spacing").min(0.0).max(2.0).step(0.001).onChange(function () {
        //     app.shaderUniforms.u_grid_spacing.value = app.debugParams.p_grid_spacing;
        //     app.renderer.render(app.scene, app.camera);
        // });
        //   mapFolder.open()

                  //add handler
        app.playerContent.addEventListener("dblclick", function (event) {

            console.log("in event");
            //LoadImage(null, null);
            PlaceToken(null, null, event);
            //LoadSound(null, null, event);

            render();

        });


        LoadImage(null, null);

        //set up render loop
        //TODO: link app to user interaction
        // function animate() {

        //     requestAnimationFrame(animate);

        //     app.controls.update();

        //     app.renderer.render(app.scene, app.camera);
        //     // composer.render(clock.getDelta());
        // }

        // animate();

    };

    /**
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    function ready() {
        app.connection.on('data', function (data) {
            console.log("Data recieved");
            var cueString = "<span class=\"cueMsg\">Cue: </span>";

            //cues come with a type
            const cueType = data.type;
            const body = data.body;

            if (cueType === "master-volume") {
                Pizzicato.volume = parseFloat(data.body["volume"]);
            }

            if (cueType === "play-once") {
                const id = data.body.id;
                const params = data.body[id];

                if (params.type === "audio") {



                }
            }

            if (cueType === "token") {
                const params = data.body;
                PlacePeerToken(params.peer, params);
            }

            if (cueType === "soundstage") {
                for (const id in body) {

                    const params = body[id];

                    //handle deleted cue
                    if (params.src == "" && app.audioMap[id]) {
                        if (app.audioMap[id].type === "audio") {
                            if (app.audioMap[id].media) {
                                app.audioMap[id].media.stop();
                            }
                        }

                        app.audioMap[id] = params;
                    }

                    if (params.type === "audio") {

                        if (!app.audioMap[id] || params.src != app.audioMap[id].src) {
                            LoadSound(id, params);
                        }

                        else if (params.ui_state === "selected") {
                            // contentMap[id].media.stop();
                            UpdateSound(id, params)

                        }

                        else if (params.ui_state === "ready") {
                            app.audioMap[id].media.stop();
                        }

                        else if (params.ui_state === "empty") {
                            app.audioMap[id] = params;
                        }

                    }

                    if (params.type === "image") {
                        // console.log(data[id]);
                        // playerContent.style.backgroundImage = 'url(' + params.src + ')';
                        if (params.ui_state === "selected") {
                            if (!app.audioMap[id] || params.src != app.audioMap[id].src) {
                                console.log("creating new image at: " + params.src);

                                LoadImage(id, params);
                                app.imageMap[id] = "debug";

                            }
                        }
                        else if (params.ui_state === "empty") {

                            app.audioMap[id] = null;
                        }
                    }

                    if (params.type === "video") {

                        if (params.ui_state === "selected") {
                            if (!app.audioMap[id] || params.src != app.audioMap[id].src) {
                                console.log("creating new video at: " + params.src);

                                var videoCue = document.getElementById("video-cue");

                                if (videoCue) {
                                    app.playerContent.removeChild(videoCue);
                                }

                                videoCue = document.createElement("video");
                                videoCue.className = "videoCue";
                                videoCue.src = params.src;
                                videoCue.autoplay = true;
                                videoCue.id = "video-cue";

                                app.playerContent.appendChild(videoCue);

                                app.audioMap[id] = params;
                            }
                        }

                        else if (params.ui_state === "empty") {
                            var videoCue = document.getElementById("video-cue");

                            if (videoCue) {
                                app.playerContent.removeChild(videoCue);
                            }

                            app.audioMap[id] = null;
                        }
                    }
                }
            }

        });
        app.connection.on('close', function () {
            app.status.innerHTML = "Connection reset<br>Awaiting connection...";
            app.connection = null;
        });
    }

    function join() {

        // Close old connection
        if (app.connection) {
            app.connection.close();
        }

        // Create connection to destination peer specified in the input field
        app.connection = app.peer.connect(app.recvIdInput.value, {
            reliable: true
        });

        app.connection.on('open', function () {
            app.status.innerHTML = "Connected to: " + app.connection.peer;
            console.log("Connected to: " + app.connection.peer);

            // Check URL params for comamnds that should be sent immediately
            var command = getUrlParam("command");
            if (command)
                app.connection.send(command);

            ready();
        });

        // Handle incoming data (messages only since this is the signal sender)
        app.connection.on('data', function (data) {
            addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
        });
        app.connection.on('close', function () {
            app.status.innerHTML = "Connection closed";
        });
    };

    function addMessage(msg) {
        var now = new Date();
        var h = now.getHours();
        var m = addZero(now.getMinutes());
        var s = addZero(now.getSeconds());

        if (h > 12)
            h -= 12;
        else if (h === 0)
            h = 12;

        function addZero(t) {
            if (t < 10)
                t = "0" + t;
            return t;
        };

        app.message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + app.message.innerHTML;
    }

    function clearMessages() {
        app.message.innerHTML = "";
        addMessage("Msgs cleared");






    }

    // Listen for enter in message box
    app.sendMessageBox.addEventListener('keypress', function (e) {
        var event = e || window.event;
        var char = event.which || event.keyCode;
        if (char == '13')
            app.sendButton.click();
    });
    // Send message
    app.sendButton.addEventListener('click', function () {
        if (app.connection && app.connection.open) {
            var msg = app.sendMessageBox.value;
            app.sendMessageBox.value = "";
            app.connection.send(msg);
            console.log("Sent: " + msg)
            addMessage("<span class=\"selfMsg\">Self: </span>" + msg);
        } else {
            console.log('Connection is closed');
        }
    });

    // Clear messages box
    app.clearMsgsButton.addEventListener('click', clearMessages);

    app.connectButton.addEventListener('click', join);

    initialize();
}