import * as L from "leaflet"
import Peer, * as peer from "peerjs"
import * as Pizzicato from "pizzicato"
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
            'https://danbleton.nyc3.digitaloceanspaces.com/circle-of-fire-and-grace/lost_city.jpeg',

            // onLoad callback
            function (texture) {

                app.scene.remove(app.scene.getObjectByName("ImageObj"));
                
                app.imageSize = new THREE.Vector2(texture.image.width, texture.image.height);
                var aspect = app.imageSize.y / app.imageSize.x;

                app.imageObj = new THREE.Mesh(
                    new THREE.PlaneGeometry(10.0, aspect * 10.0),
                    new THREE.MeshBasicMaterial({
                        map: texture
                    })
                );
                app.imageObj.name = "ImageObj";
                app.imageObj.position.setZ(-0.01);
                app.scene.add(app.imageObj);
                

            },

            // onProgress callback currently not supported
            undefined,

            // onError callback
            function (err) {
                console.error('An error happened.');
            }
        );
    }

    function PlaceToken(id, params, event) {

        //var screenPoint = new THREE.Vector2(0,0);
        app.mousePosition.x = ((event.clientX - renderer.domElement.offsetLeft) / renderer.domElement.clientWidth) * 2 - 1;
        app.mousePosition.y = - ((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;

        // update the picking ray with the camera and screenPoint position
        raycaster.setFromCamera(app.mousePosition, app.camera);

        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(app.scene.children);

        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {

                //TODO: place token
                console.log(intersects[i].point);

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
        app.gridScale = 300.0;
        app.gridOpacity = 0.75;
        app.imageSize = new THREE.Vector2(1920, 1080);

        //init threejs
        app.scene = new THREE.Scene();
        app.camera = new THREE.PerspectiveCamera(75, app.clientSize.x / app.clientSize.y, 0.1, 100);
        app.renderer = new THREE.WebGLRenderer();
        app.renderer.setSize(app.clientSize.x, app.clientSize.y);
        app.playerContent.appendChild(app.renderer.domElement);

        //orbit controls
        app.controls = new OrbitControls(app.camera, app.renderer.domElement);

        app.camera.position.set(0, 0, 5);
        app.controls.update();

        //image plane
        var aspect = app.imageSize.y / app.imageSize.x;

        // app.imageSize = new THREE.Vector2(texture.image.width, texture.image.height);
        // var aspect = app.imageSize.y / app.imageSize.x;

        app.imageObj = new THREE.Mesh(
            new THREE.PlaneGeometry(10.0, aspect * 10.0),
            new THREE.MeshBasicMaterial({
                // map: texture
            })
        );
        app.imageObj.name = "ImageObj";
        app.scene.add(app.imageObj);


        //hex grid plane
        app.debugParams = {
            p_grid_scale: 100.0,
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
            u_image_dims: { value: app.imageSize },
        }

        app.gridObj = new THREE.Mesh(
            new THREE.PlaneGeometry(100.0, aspect * 100.0),
            new THREE.ShaderMaterial({
                vertexShader: MapShaders.buildMapVertexShader(),
                fragmentShader: MapShaders.buildMapFragmentShader(),
                depthWrite: false,
                depthTest: true,
                blending: THREE.AdditiveBlending,
                uniforms: app.shaderUniforms
            })
        );
        app.gridObj.position.set(0.0, 0.0, 0.001);
        app.scene.add(app.gridObj);

        //add handler
        app.playerContent.addEventListener("mousedown", function(event){

            console.log("in event");
            LoadImage(null, null);

            //LoadSound(null, null, event);

        });

        //set up render loop
        //TODO: link app to user interaction
        function animate() {

            requestAnimationFrame(animate);

            app.controls.update();

            app.renderer.render(app.scene, app.camera);
            // composer.render(clock.getDelta());
        }

        animate();

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
                                console.log("creating new video at: " + params.src);

                                var videoCue = document.getElementById("video-cue");

                                if (videoCue) {
                                    app.playerContent.removeChild(videoCue);
                                }

                                videoCue = document.createElement("img");
                                videoCue.className = "videoCue";
                                videoCue.src = params.src;
                                // videoCue.autoplay = true;
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