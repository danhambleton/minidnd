import * as L from "leaflet"
import Peer, * as peer from "peerjs"
import { setupDragAndDrop } from "./DragAndDrop.js"
import aws from "aws-sdk"
import { nanoid } from 'nanoid'
import { SoundCue, ModelCue, MapCue, CueState, CueType } from "./Cues.js"
import { PeerHelper } from "./PeerHelper.js"
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { UIHelpers } from "./UIHelpers.js"
import { ceil } from "lodash"

main();

function main() {


    const app = {

        requestID : "",

        //peer
        lastPeerId: null,
        peer: null, // own peer objec,
        conn: new Array(),

        //digital ocean spaces
        s3: new aws.S3({
            endpoint: process.env.SPACES_ENDPOINT,
            accessKeyId: process.env.SPACES_ACCESS_KEY,
            secretAccessKey: process.env.SPACES_SECRET_KEY,
        }),

        //ui
        hostID: document.getElementById("host-id"),
        status: document.getElementById("status"),
        message: document.getElementById("message"),
        inspector: document.getElementById("inspector"),
        sendMessageBox: document.getElementById("sendMessageBox"),
        sendButton: document.getElementById("sendButton"),
        clearMsgsButton: document.getElementById("clearMsgsButton"),
        playContentButton: document.getElementById("playContent"),
        saveContentButton: document.getElementById("saveWorkspace"),
        stopContentButton: document.getElementById("stopContent"),
        masterVolumeSlider: document.getElementById("master-volume"),
        masterVolumeLabel: document.getElementById("volume-label"),
        cueString: "<span class=\"cueMsg\">Cue: </span>",
        stagingArea: document.getElementById("stagedContent"),

        //specific
        cueMap: {}
    };

        /**
     * Get first "GET style" parameter from href.
     * This enables delivering an initial command upon page load.
     *
     * Would have been easier to use location.hash.
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

    app.requestID = getUrlParam("id");

    console.log(app.requestID);


    function getContentType(filepath) {
        var ext = filepath.split('.').pop().toLowerCase();
        if (ext === 'mp3' || ext === 'ogg' || ext === 'wav') {
            return 'audio';
        }

        if (ext === 'webm' || ext === 'mp4') {
            return 'video';
        }

        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
            return 'image';
        }

        if (ext === 'gltf' || ext === 'glb' || ext === 'obj' || ext === 'stl') {
            return 'model';
        }

        return 'unknown';
    }

    function getCueFromFileType(filepath) {
        var ext = filepath.split('.').pop().toLowerCase();
        if (ext === 'mp3' || ext === 'ogg' || ext === 'wav') {
            return new SoundCue();
        }

        // if (ext === 'webm' || ext === 'mp4') {
        //     return 'video';
        // }

        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
            return new MapCue();
        }

        if (ext === 'gltf' || ext === 'glb' || ext === 'obj' || ext === 'stl') {
            return new ModelCue();
        }

        return null;
    }

    function getShortName(filepath) {

        var name = filepath.split(/(\\|\/)/g).pop();
        return name.length < 8 ? name : name.substring(0, 12);

    }

    async function LoadWorkspace(callback) {

        if (app.peer.id === null) {
            console.log("No peer ID. Cannot upload assets...");
            return;
        }

        // let dataTransfer = event.dataTransfer;
        // let files = dataTransfer.files;
        let asset;// = JSON.stringify(stagedContent);

        // Add a file to a Space
        var params = {
            Body: asset,
            Bucket: process.env.SPACES_BUCKET,
            Key: app.peer.id + "/manifest.json",

        };

        app.s3.getObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                //console.log(data.Body.toString());

                app.cueMap = JSON.parse(data.Body);

                console.log(app.cueMap);

                callback();
            }
        });
    }

    async function SaveWorkspace(manifestJSON) {

        if (app.peer.id === null) {
            console.log("No peer ID. Cannot upload assets...");
            return;
        }

        // let dataTransfer = event.dataTransfer;
        // let files = dataTransfer.files;
        let asset = manifestJSON;//JSON.stringify(stagedContent);

        // Add a file to a Space
        var params = {
            Body: asset,
            Bucket: process.env.SPACES_BUCKET,
            Key: app.peer.id + "/manifest.json",
            ACL: 'public-read',
            ContentType: 'application/json'
        };

        app.s3.putObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                console.log(data);
            }
        });
    }

    async function UploadAsset(event) {
        if (app.peer.id === null) {
            console.log("No peer ID. Cannot upload assets...");
            return;
        }

        let dataTransfer = event.dataTransfer;
        let files = dataTransfer.files;
        let asset = files[0];

        let id = event.srcElement.id;

        // Add a file to a Space
        var params = {
            Body: asset,
            Bucket: process.env.SPACES_BUCKET,
            Key: app.peer.id + "/" + files[0].name,
            ACL: 'public-read'
        };

        event.srcElement.innerHTML = "<h2>Uploading</h2>";

        app.s3.putObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                // console.log(data);

                var cue = getCueFromFileType(params.Key);

                var url = "https://" + process.env.SPACES_BUCKET + "." + process.env.SPACES_ENDPOINT + "/" + params.Key;
                cue.src = url;
                cue.id = nanoid(10);
                cue.name = getShortName(params.Key);
                cue.state = CueState.READY;

                app.cueMap[id] = cue;

                event.srcElement.className = "cueElementReady";
                event.srcElement.innerHTML = "<h2>" + cue.name + "</h2>";

                console.log(app.cueMap);

                if (cue.type === "map") {
                    event.srcElement.style.backgroundImage = 'url(' + cue.src + ')';
                }

                SaveWorkspace(JSON.stringify(app.cueMap));
            }
        });
    }

    function sendCue (cue) {
        
        //send staged content to all connected peers
        for (const c of app.conn) {

            if (c && c.open) {

                c.send(cue);

            } else {
                console.log('Connection is closed');
            }
        }
    }

    function BuildContentGrid() {
        var stagingArea = document.getElementById("contentGrid");
        for (var i = 0; i < process.env.MAX_SLOTS; i++) {
            var b = document.createElement("button");
            b.className = "cueElementEmpty";
            b.id = "cb_" + i.toString().padStart(2, '0');

            stagingArea.appendChild(b);

            // Set up drag-and-drop for the active area
            setupDragAndDrop(b, UploadAsset);

            b.addEventListener('click', function () {
                let id = this.id;
                if (app.cueMap[this.id]) {
                    //clear ui
                    while (app.inspector.firstChild) {
                        app.inspector.removeChild(app.inspector.firstChild);
                    }

                    var uiHelper = new UIHelpers();
                    if (app.cueMap[this.id].type === "sound") {
                        console.log("building inspector");
                        uiHelper.buildSoundInspector(app, id)
                    }
                    if (app.cueMap[this.id].type === "model") {
                        console.log("building inspector");
                        uiHelper.buildModelInspector(app, id)
                    }
                    if (app.cueMap[this.id].type === "map") {
                        console.log("building inspector");
                        uiHelper.buildMapInspector(app, id)
                    }

                    if (app.cueMap[this.id].state === CueState.READY) {
                        this.className = "cueElementSelected";
                        app.cueMap[this.id].state = CueState.ACTIVE;

                    }
                    else if (app.cueMap[this.id].state === CueState.ACTIVE) {
                        this.className = "cueElementReady";
                        app.cueMap[this.id].state = CueState.READY;
                    }

                }
            });
        }
    }

    //Load grid contents from manifest
    function LoadContentGrid() {

        for (var i = 0; i < process.env.MAX_SLOTS; i++) {

            let id = "cb_" + i.toString().padStart(2, '0');
            if (app.cueMap[id]) {
                var b = document.getElementById(id);

                if (b) {
                    b.className = "cueElementEmpty";
                    b.innerHTML = "<h2>" + getShortName(app.cueMap[id].src) + "</h2>";

                    if (app.cueMap[id].state === CueState.ACTIVE) {
                        b.className = "cueElementSelected";
                    }

                    if (app.cueMap[id].state === CueState.READY) {
                        b.className = "cueElementReady";
                    }

                    if (app.cueMap[id].type === CueType.MAP) {
                        b.style.backgroundImage = 'url(' + app.cueMap[id].src + ')';
                    }
                }

            }


        }
    }



    function sendAllCues () {

        //send staged content to all connected peers
        for (const c of app.conn) {

            if (c && c.open) {

                for(const cid in app.cueMap)
                {
                    c.send(app.cueMap[cid]);
                }

            } else {
                console.log('Connection is closed');
            }
        }

    }

    function deactivateAllCues() {

    }

    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */
    function initialize() {

        var peerHelper = new PeerHelper();
        peerHelper.initAsHost(app, function(){
            LoadWorkspace(LoadContentGrid);
        },
        addMessage);
    };


    /**
     * Get first "GET style" parameter from href.
     * This enables delivering an initial command upon page load.
     *
     * Would have been easier to use location.hash.
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

    /**
     * Send a signal via the peer connection and add it to the log.
     * This will only occur if the connection is still alive.
     */
    // function signal(sigName) {
    //     if (conn && conn.open) {
    //         conn.send(sigName);
    //         console.log(sigName + " signal sent");
    //         addMessage(cueString + sigName);
    //     } else {
    //         console.log('Connection is closed');
    //     }
    // }

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

        app.message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + message.innerHTML;
    };

    function clearMessages() {
        app.message.innerHTML = "";
        addMessage("Msgs cleared");
    };

    //Build content grid
    BuildContentGrid();

    

    // Listen for enter in message box
    app.sendMessageBox.addEventListener('keypress', function (e) {
        var event = e || window.event;
        var char = event.which || event.keyCode;
        if (char == '13')
            app.sendButton.click();
    });
    // Send message
    app.sendButton.addEventListener('click', function () {

        var msg = app.sendMessageBox.value;
        app.sendMessageBox.value = "";
        for (const c of app.conn) {
            if (c && c.open) {
                c.send(msg);
            } else {
                console.log('Connection is closed');
            }
        }

        console.log("Sent: " + msg);
        addMessage("<span class=\"selfMsg\">Self: </span> " + msg);

    });

    // Clear messages box
    app.clearMsgsButton.addEventListener('click', clearMessages);
    // Start peer connection on click
    // connectButton.addEventListener('click', join);

    app.saveContentButton.addEventListener('click', function () {

        SaveWorkspace(JSON.stringify(app.cueMap));

    });

    app.playContentButton.addEventListener('click', function () {

        sendAllCues();

    });

    app.stopContentButton.addEventListener('click', function () {

        sendCue({
            type : CueType.AUDIOKILL
        })
    });

    app.masterVolumeSlider.addEventListener("change", function () {
        app.masterVolumeLabel.innerHTML = this.value;
        sendCue({
            type : CueType.VOLUME,
            volume : parseFloat(this.value)
        })

    })

    // Since all our callbacks are setup, start the process of obtaining an ID
    initialize();
}