import * as L from "leaflet"
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
import { Actions } from "./Actions.js"
import { HexGrid } from "./HexGrid.js"
import { PeerHelper } from "./PeerHelper.js"
import { ThreeHelper } from "./ThreeHelper.js";
import { SoundCue, ModelCue, MapCue, CueState, CueType } from "./Cues.js"

main();

function main() {

    const app = {

        //Threejs
        renderer: null,
        camera: null,
        scene: null,
        controls: null,
        transformControl: null,
        mousePosition: new THREE.Vector2(0.5, 0.5),
        matcaps: {},

        //peerjs 
        peer: null,
        connection: null,
        lastPeerId: null,

        //app specific
        cueMap: {}, //unlike the sender, this is indexed by unique id.
        imageObj: null,
        gridObj: null,
        gridScale: 0.025,
        gridOpacity: 0.75,
        imageSize: new THREE.Vector2(1920, 1080),
        clientSize: null,
        profileColor: Math.floor(Math.random() * 16777215).toString(16),
        profileModel: null,
        activeObj: null,
        transients: [],
        keyMap: {},
        mapWidth: 5.0,

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

    const actions = new Actions();

    const hexGrid = new HexGrid();

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

    function LoadModel(id, params) {

        actions.loadModel(app, params, function () {

            console.log("post model load...");

        });
    }


    function LoadSound(id, params) {

        actions.loadSound(app, params, function () {

            console.log("post sound load...");

        });
    }

    function PreLoad() {

        actions.loadImage(
            app,
            { src: 'https://danbleton.nyc3.digitaloceanspaces.com/public/matcaps/512/B5BBB5_3B4026_6E745D_5C6147-512px.png' },
            function (texture) {
                app.matcaps.playerTokenMatcap = texture;
                console.log("Matcap created...");
            });

        actions.loadModel(app,
            { src: 'https://danbleton.nyc3.digitaloceanspaces.com/public/DesertWarrior.glb' },
            function (model) {

                app.profileModel = model;

                if (app.profileModel) {
                    console.log("loaded model with children: " + app.profileModel.children.length)
                }

                //scale?
            });
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

        var ns = new THREE.Vector3(
            paramsObj.scale.x,
            paramsObj.scale.y,
            paramsObj.scale.z
        );

        var nr = new THREE.Vector3(
            paramsObj.rotation._x,
            paramsObj.rotation._y,
            paramsObj.rotation._z
        )

        var peerColor = new THREE.Color(
            "#" + paramsObj.color
        );

        console.log("peer token params:" + params);
        console.log(nr);

        var tokenObj = app.scene.getObjectByName(paramsObj.obj_name);

        if (!tokenObj) {
            console.log("creating token object");
            tokenObj = app.profileModel.clone();

            tokenObj.name = paramsObj.obj_name;
            tokenObj.position.set(np.x, np.y, np.z);
            tokenObj.scale.set(ns.x, ns.y, ns.z);
            tokenObj.rotation.set(nr.x, nr.y, nr.z);

            //create a new material
            var newMat = new THREE.MeshMatcapMaterial({
                matcap: app.matcaps.playerTokenMatcap
            })

            tokenObj.traverse(function (object) {
                if (object.isMesh) {
                    object.material = newMat;
                    object.material.color.set(peerColor);
                    object.material.needsUpdate = true;
                    object.userData.root = tokenObj.id;
                    object.castShadow = true;
                    object.receiveShadow = true;

                }
                object.userData.isTransient = true;
            });
            app.transients.push(tokenObj);
            tokenObj.userData.isTransient = true;
            app.scene.add(tokenObj);

        }
        else {
            //console.log("have token object");
            console.log("updating token object: " + paramsObj.obj_name);
            tokenObj.position.set(np.x, np.y, np.z);
            tokenObj.scale.set(ns.x, ns.y, ns.z);
            tokenObj.rotation.set(nr.x, nr.y, nr.z);

        }

        app.renderer.render(app.scene, app.camera);

    }

    function SelectToken(event) {

        //var screenPoint = new THREE.Vector2(0,0);
        app.mousePosition.x = ((event.clientX - app.renderer.domElement.offsetLeft) / app.renderer.domElement.clientWidth) * 2 - 1;
        app.mousePosition.y = - ((event.clientY - app.renderer.domElement.offsetTop) / app.renderer.domElement.clientHeight) * 2 + 1;

        actions.pickObjectInScene(app, {});

    }

    function initialize() {

        var peerHelper = new PeerHelper();
        peerHelper.initAsPlayer(app, process.env.PEERJS_SERVER);

        var threeHelper = new ThreeHelper();
        threeHelper.initScene(app);


        function resizeRendererToDisplaySize() {
            const canvas = app.renderer.domElement;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const needResize = canvas.width !== width || canvas.height !== height;
            if (needResize) {
                console.log("resizing renderer...");
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
            console.log(app.camera.zoom);
            app.renderer.render(app.scene, app.camera);
        }
        render();

        app.controls.addEventListener('change', render);
        window.addEventListener('resize', function () {


            app.clientSize = new THREE.Vector2(app.playerContent.offsetWidth, app.playerContent.offsetHeight);
            // app.renderer.domElement.width = app.clientSize.x;
            // app.renderer.domElement.height = app.clientSize.y;
            app.camera.aspect = app.clientSize.x / app.clientSize.y;
            app.renderer.setSize(app.clientSize.x, app.clientSize.y);
            app.camera.updateProjectionMatrix();

            console.log("updating window size");
            render();

        });

        onkeydown = onkeyup = function (e) {
            e = e || event; // to deal with IE
            app.keyMap[e.keyCode] = e.type == 'keydown';
            /* insert conditional here */

            if (app.keyMap[81]) {
                //move hex +y
                actions.movePlayerToNextHex(app, new THREE.Vector3(-1.0, 1.0, 0.0));

            }
            if (app.keyMap[87]) {
                //move hex -z
                actions.movePlayerToNextHex(app, new THREE.Vector3(0.0, 1.0, -1.0));

            }
            if (app.keyMap[69]) {
                //move hex +x
                actions.movePlayerToNextHex(app, new THREE.Vector3(1.0, 0.0, -1.0));

            }
            if (app.keyMap[65]) {
                //move hex -x
                actions.movePlayerToNextHex(app, new THREE.Vector3(-1.0, 0.0, 1.0));

            }
            if (app.keyMap[83]) {
                //move hex +z
                actions.movePlayerToNextHex(app, new THREE.Vector3(0.0, -1.0, 1.0));

            }
            if (app.keyMap[68]) {
                //move hex -y
                actions.movePlayerToNextHex(app, new THREE.Vector3(1.0, -1.0, 0.0));

            }

            render();
        }

        app.transformControl = new TransformControls(app.camera, app.renderer.domElement);
        app.transformControl.setSize(2.0);
        app.transformControl.addEventListener('change', render);
        app.transformControl.addEventListener('dragging-changed', function (event) {

            app.controls.enabled = !event.value;

            //send message to host
            if (app.connection && app.connection.open) {

                var tokenParams = {
                    peer: app.peer.id,
                    obj_name: app.activeObj.name,
                    position: app.activeObj.position,
                    scale: app.activeObj.scale,
                    rotation: app.activeObj.rotation,
                    color: app.profileColor
                }

                console.log(tokenParams);

                var cue = {
                    type: "token",
                    body: JSON.stringify(tokenParams)
                }

                app.connection.send(cue);
            }

        });

        app.playerContent.addEventListener("click", function (event) {

            SelectToken(event);
            render();

        });

        //add handler
        app.playerContent.addEventListener("dblclick", function (event) {

            console.log("in event");

            app.mousePosition.x = ((event.clientX - app.renderer.domElement.offsetLeft) / app.renderer.domElement.clientWidth) * 2 - 1;
            app.mousePosition.y = - ((event.clientY - app.renderer.domElement.offsetTop) / app.renderer.domElement.clientHeight) * 2 + 1;

            actions.pickHexGridPoint(app, function (hp) {

                console.log("hex point: " + hp.x + ", " + hp.y + ", " + hp.z);
                actions.addPlayerTokenToScene(app, {}, function (id) {
                    console.log("id: " + id);
                    var obj = app.scene.getObjectById(id);
                    console.log("obj: " + obj.id);
                    obj.position.set(hp.x, 0.0, hp.y);

                });

            });


            render();

            //LoadSound(null, null, event);

            //send message to host
            // if (app.connection && app.connection.open) {

            //     var tokenParams = {
            //         peer: app.peer.id,
            //         obj_name: app.activeObj.name,
            //         position: app.activeObj.position,
            //         scale: app.activeObj.scale,
            //         rotation: app.activeObj.rotation,
            //         color: app.profileColor
            //     }

            //     console.log(tokenParams);

            //     var cue = {
            //         type: "token",
            //         body: JSON.stringify(tokenParams)
            //     }

            //     app.connection.send(cue);
            // }

            // render();

        });

        actions.buildMapScene(app,
            {
                src: 'https://danbleton.nyc3.digitaloceanspaces.com/circle-of-fire-and-grace/douganshole.jpg',
                showGrid : true,
                gridScale: 0.04,
                gridOpacity: 0.75,
                lineThickness: 0.15
            }, function () {});

        PreLoad();

        window.addEventListener('keydown', function (event) {

            switch (event.keyCode) {

                case 81: // Q
                    app.transformControl.setSpace(app.transformControl.space === "local" ? "world" : "local");
                    break;

                case 87: // W
                    app.transformControl.setMode("translate");
                    break;

                case 69: // E
                    app.transformControl.setMode("rotate");
                    break;

                case 82: // R
                    app.transformControl.setMode("scale");
                    break;

            }

        });

    };

    /**
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    function ready() {
        app.connection.on('data', function (data) {
            console.log("Data recieved");
            var cueString = "<span class=\"cueMsg\">Cue: </span>";

            //we expect one key at a time

            if(!data.type)
            {
                console.log("unknown cue type!");
                return;
            }

            const cue = data;
            let id = cue.id;

            console.log(cue);

            //handle deleted cue
            if (cue.src == "" && app.cueMap[id]) {
                if (app.cueMap[id].type === CueType.SOUND) {
                    if (app.cueMap[id].media) {
                        app.cueMap[id].media.stop();
                    }
                }
                app.cueMap[id] = null; //??
            }

            //Stop all audio
            if (cue.type === CueType.AUDIOKILL) {

                for(const cid in app.cueMap)
                {
                    if(app.cueMap[cid].type === CueType.SOUND) {
                        app.cueMap[cid].media.stop();
                        app.cueMap[cid].state = CueState.READY;
                    }
                }
            }

            //Change master volume
            if (cue.type === CueType.VOLUME) {
                console.log("changing volume: " + cue.volume);
                Pizzicato.volume = cue.volume;
            }

            //Handle sound cues
            if (cue.type === CueType.SOUND) {

                if (!app.cueMap[id] || cue.src !== app.cueMap[id].src) {

                    actions.loadSound(app, cue, function (id) {

                        if (cue.state === CueState.ACTIVE) {
                            app.cueMap[id].media.play();
                            app.cueMap[id].state = CueState.PLAYING;
                        }
                    })
                }

                else if (cue.state === CueState.ACTIVE || cue.state === CueState.PLAYING) {
                    // contentMap[id].media.stop();
                    console.log("updating sound...");
                    console.log(cue);
                    actions.updateSound(app, cue);

                    if (app.cueMap[id].state !== CueState.PLAYING) {
                        app.cueMap[id].media.play();
                        app.cueMap[id].state = CueState.PLAYING;
                    }
                }

                else if (cue.state === CueState.READY) {
                    app.cueMap[id].media.stop();
                }

                else if (cue.state === CueState.EMPTY) {
                    app.cueMap[id] = null;
                }
            }

            //handle model cues
            if (cue.type === CueType.MODEL) {

                if (!app.cueMap[id] || cue.src !== app.cueMap[id].src) {

                    app.cueMap[id] = cue;

                    actions.loadModel(app, cue, function(model) {

                        app.cueMap[id].model = model;

                        if (cue.state === CueState.ACTIVE) {                    
                            actions.addModelToScene(app, app.cueMap[id]);
                            app.cueMap[id].state = CueState.PLAYING;
                        }
                    });
                }

                else if (cue.state === CueState.ACTIVE || cue.state === CueState.PLAYING) {
                    // contentMap[id].media.stop();
                    console.log("updating map...");
                    console.log(cue);

                    //TODO: update model
                    //actions.updateSound(app, cue);

                    if (app.cueMap[id].state !== CueState.PLAYING) {
                        actions.addModelToScene(app, app.cueMap[id]);
                        app.cueMap[id].state = CueState.PLAYING;  
                    }
                }
            }

            //handle map cues
            if (cue.type === CueType.MAP) {

                if (!app.cueMap[id] || cue.src !== app.cueMap[id].src) {

                    app.cueMap[id] = cue;

                    actions.loadImage(app, cue, function(texture) {

                        app.cueMap[id].texture = texture;

                        if (cue.state === CueState.ACTIVE) {
                            
                            actions.buildMapScene(app, cue, function (){
                                app.cueMap[id].state = CueState.PLAYING;
                            });
                        }
                    });
                }

                else if (cue.state === CueState.ACTIVE || cue.state === CueState.PLAYING) {
                    // contentMap[id].media.stop();
                    console.log("updating map...");
                    console.log(cue);

                    //TODO: update map
                    //actions.updateSound(app, cue);

                    if (app.cueMap[id].state !== CueState.PLAYING) {
                        actions.buildMapScene(app, cue, function (){
                            app.cueMap[id].state = CueState.PLAYING;
                        });
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