import * as L from "leaflet"
import Peer, * as peer from "peerjs"
import { setupDragAndDrop } from "./DragAndDrop.js"
import aws from "aws-sdk"
import { nanoid } from 'nanoid'

main();

function main() {

    var lastPeerId = null;
    var peer = null; // own peer object
    var conn = new Array();
    var hostID = document.getElementById("host-id");
    var status = document.getElementById("status");
    var message = document.getElementById("message");

    var inspector = document.getElementById("inspector");

    var sendMessageBox = document.getElementById("sendMessageBox");
    var sendButton = document.getElementById("sendButton");
    var clearMsgsButton = document.getElementById("clearMsgsButton");
    var playContentButton = document.getElementById("playContent");
    var masterVolumeSlider = document.getElementById("master-volume");
    var masterVolumeLabel= document.getElementById("volume-label");
    // var connectButton = document.getElementById("connect-button");
    var cueString = "<span class=\"cueMsg\">Cue: </span>";

    var stagingArea = document.getElementById("stagedContent");

    //The main container for the content
    var stagedContent = {};

    var defaultCueParams = {
        src: "",
        type: "",
        content_state: "empty",
        ui_state: 'empty',
        media: null,
        effects: [],
        volume: 0.5,
        pan: 0.0,
        loop: 0,
        reverb: 0,
        fade_in: 1.0,
        fade_out: 1.0
    };

    const s3 = new aws.S3({
        endpoint: process.env.SPACES_ENDPOINT,
        accessKeyId: process.env.SPACES_ACCESS_KEY,
        secretAccessKey: process.env.SPACES_SECRET_KEY,
    });

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

        return 'unknown';
    }

    function getShortName(filepath) {

        var name = filepath.split(/(\\|\/)/g).pop();
        return name.length < 8 ? name : name.substring(0, 12);

    }

    async function LoadWorkspace(callback) {

        if (peer.id === null) {
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
            Key: peer.id + "/manifest.json",

        };

        s3.getObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                //console.log(data.Body.toString());

                stagedContent = JSON.parse(data.Body);

                console.log(stagedContent);

                callback();
            }
        });
    }

    async function SaveWorkspace(manifestJSON) {

        if (peer.id === null) {
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
            Key: peer.id + "/manifest.json",
            ACL: 'public-read',
            ContentType: 'application/json'
        };

        s3.putObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                console.log(data);
            }
        });
    }

    async function UploadAsset(event) {
        if (peer.id === null) {
            console.log("No peer ID. Cannot upload assets...");
            return;
        }

        let dataTransfer = event.dataTransfer;
        let files = dataTransfer.files;
        let asset = files[0];

        var id = event.srcElement.id;

        // Add a file to a Space
        var params = {
            Body: asset,
            Bucket: process.env.SPACES_BUCKET,
            Key: peer.id + "/" + files[0].name,
            ACL: 'public-read'
        };

        event.srcElement.innerHTML = "<h2>Uploading</h2>";

        s3.putObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {
                console.log(data);
                event.srcElement.className = "cueElementReady";
                event.srcElement.innerHTML = "<h2>" + getShortName(params.Key) + "</h2>";

                //set up audio for this element

                var url = "https://" + process.env.SPACES_BUCKET + "." + process.env.SPACES_ENDPOINT + "/" + params.Key;

                var contentParams = {
                    src: url,
                    type: getContentType(params.Key),
                    content_state: "none",
                    ui_state: 'ready',
                    media: null,
                    effects: [],
                    volume: 0.5,
                    pan: 0.0,
                    loop: 0,
                    reverb: 0,
                    fade_in: 1.0,
                    fade_out: 1.0
                }

                stagedContent[id] = contentParams;

                if (contentParams.type === "image") {
                    event.srcElement.style.backgroundImage = 'url(' + contentParams.src + ')';
                }

                SaveWorkspace(JSON.stringify(stagedContent));


            }
        });
    }

    function BuildContentInspector(id) {

        if(!inspector)
            return;
        
        //display inspector
        //remove all child elements
        while (inspector.firstChild) {
            inspector.removeChild(inspector.firstChild);
        }

        if(!stagedContent[id])
            return;

        //custom elements
        // inspector.title = getShortName(stagedContent[this.id].src);
        inspector.innerHTML = "<h1>" + getShortName(stagedContent[id].src) + "</h1>";

        let disp = document.createElement("button");
        disp.className = "inspectorDisplay";
        inspector.appendChild(disp);

        var volLabel = document.createElement('h3');
        disp.appendChild(volLabel);

        var volSlider = document.createElement("input");
        disp.appendChild(volSlider);
        volSlider.type = "range";
        volSlider.min = 0.0;
        volSlider.max = 1.0;
        volSlider.step = 0.01;
        volSlider.value = stagedContent[id].volume;

        volLabel.innerHTML = "Volume: " + volSlider.value;

        // Update the current slider value (each time you drag the slider handle)
        volSlider.oninput = function () {
            stagedContent[id].volume = this.value;
            // disp.innerHTML = "<h3>" + JSON.stringify(stagedContent[id],null, 2)+ "</h3>";
            volLabel.innerHTML = "Volume: " + volSlider.value;
        }

        var panLabel = document.createElement('h3');
        disp.appendChild(panLabel);

        var panSlider = document.createElement("input");
        panSlider.type = "range";
        panSlider.min = -1.0;
        panSlider.max = 1.0;
        panSlider.step = 0.01;
        panSlider.value = stagedContent[id].pan;
        disp.appendChild(panSlider);
        panLabel.innerHTML = "Pan: " + panSlider.value;

        // Update the current slider value (each time you drag the slider handle)
        panSlider.oninput = function () {
            stagedContent[id].pan = this.value;
            // disp.innerHTML = "<h3>" + JSON.stringify(stagedContent[id],null, 2)+ "</h3>";
            panLabel.innerHTML = "Pan: " + panSlider.value;
        }

        var loopLable = document.createElement('h3');
        disp.appendChild(loopLable);

        var loopSlider = document.createElement("input");
        loopSlider.type = "range";
        loopSlider.min = 0.0;
        loopSlider.max = 1.0;
        loopSlider.step = 1.0;
        loopSlider.value = stagedContent[id].loop;
        disp.appendChild(loopSlider);
        loopLable.innerHTML = "Loop: " + loopSlider.value;

        // Update the current slider value (each time you drag the slider handle)
        loopSlider.oninput = function () {
            stagedContent[id].loop = this.value;
            // disp.innerHTML = "<h3>" + JSON.stringify(stagedContent[id],null, 2)+ "</h3>";
            loopLable.innerHTML = "Loop: " + loopSlider.value;
        }

        var reverbLabel = document.createElement('h3');
        disp.appendChild(reverbLabel);

        var reverbSlider = document.createElement("input");
        reverbSlider.type = "range";
        reverbSlider.min = 0.0;
        reverbSlider.max = 1.0;
        reverbSlider.step = 0.1;
        reverbSlider.value = stagedContent[id].reverb;
        disp.appendChild(reverbSlider);
        reverbLabel.innerHTML = "Reverb: " + reverbSlider.value;

        // Update the current slider value (each time you drag the slider handle)
        reverbSlider.oninput = function () {
            stagedContent[id].reverb = this.value;
            // disp.innerHTML = "<h3>" + JSON.stringify(stagedContent[id],null, 2)+ "</h3>";
            reverbLabel.innerHTML = "Reverb: " + reverbSlider.value;
        }

        ///FADE IN
        var fadeInLabel = document.createElement('h3');
        disp.appendChild(fadeInLabel);

        var fadeInSlider = document.createElement("input");
        fadeInSlider.type = "range";
        fadeInSlider.min = 0.0;
        fadeInSlider.max = 5.0;
        fadeInSlider.step = 0.1;
        fadeInSlider.value = stagedContent[id].fadeIn;
        disp.appendChild(fadeInSlider);
        fadeInLabel.innerHTML = "Fade In: " + fadeInSlider.value;

        // Update the current slider value (each time you drag the slider handle)
        fadeInSlider.oninput = function () {
            stagedContent[id].fadeIn = this.value;
            // disp.innerHTML = "<h3>" + JSON.stringify(stagedContent[id],null, 2)+ "</h3>";
            fadeInLabel.innerHTML = "Fade In: " + fadeInSlider.value;
        }

        ///FADE OUT
        var fadeOutLabel = document.createElement('h3');
        disp.appendChild(fadeOutLabel);

        var fadeOutSlider = document.createElement("input");
        fadeOutSlider.type = "range";
        fadeOutSlider.min = 0.0;
        fadeOutSlider.max = 1.0;
        fadeOutSlider.step = 0.1;
        fadeOutSlider.value = stagedContent[id].fadeOut;
        disp.appendChild(fadeOutSlider);
        fadeOutLabel.innerHTML = "Fade Out: " + fadeOutSlider.value;

        // Update the current slider value (each time you drag the slider handle)
        fadeOutSlider.oninput = function () {
            stagedContent[id].fadeOut = this.value;
            // disp.innerHTML = "<h3>" + JSON.stringify(stagedContent[id],null, 2)+ "</h3>";
            fadeOutLabel.innerHTML = "Fade Out: " + fadeOutSlider.value;
        }

        //DELETE
        var oneShotButton = document.createElement("button");
        oneShotButton.className = "cueElementReady";
        oneShotButton.style.backgroundColor = "#15e49f";
        disp.appendChild(oneShotButton);
        oneShotButton.innerHTML = "Play One Shot";
        oneShotButton.addEventListener("click", function() {



        });

        //DELETE
        var deleteButton = document.createElement("button");
        deleteButton.className = "cueElementReady";
        deleteButton.style.backgroundColor = "#ff1111";
        disp.appendChild(deleteButton);
        deleteButton.innerHTML = "Delete Cue";
        deleteButton.addEventListener("click", function() {

            stagedContent[id] = {
                src: "",
                type: "",
                content_state: "empty",
                ui_state: 'empty',
                media: null,
                effects: [],
                volume: 0.5,
                pan: 0.0,
                loop: 0,
                reverb: 0,
                fade_in: 1.0,
                fade_out: 1.0
            }

            var cueButton = document.getElementById(id);

            if(cueButton)
            {
                cueButton.className = "cueElementEmpty";
                cueButton.style.backgroundImage = "url()";
                cueButton.innerHTML = "";

                SaveWorkspace(JSON.stringify(stagedContent));

                //remove inspector ui
                while (inspector.firstChild) {
                    inspector.removeChild(inspector.firstChild);
                }
            }

        });
    }

    function BuildContentGrid() {
        var stagingArea = document.getElementById("contentGrid");
        for (var i = 0; i < 16; i++) {
            var b = document.createElement("button");
            b.className = "cueElementEmpty";
            b.id = "cb_" + i.toString().padStart(2, '0');
            stagedContent[b.id] = {
                src: "",
                type: "",
                content_state: "empty",
                ui_state: 'empty',
                media: null,
                effects: [],
                volume: 0.5,
                pan: 0.0,
                loop: 0,
                reverb: 0,
                fade_in: 1.0,
                fade_out: 1.0
            }
            stagingArea.appendChild(b);

            // Set up drag-and-drop for the active area
            setupDragAndDrop(b, UploadAsset);

            b.addEventListener('click', function () {

                //TODO: set options
                if (stagedContent[this.id].ui_state === "ready") {
                    this.className = "cueElementSelected";
                    let id = this.id;
                    stagedContent[this.id].ui_state = "selected";

                    BuildContentInspector(this.id);

                }
                else if (stagedContent[this.id].ui_state === "selected") {
                    this.className = "cueElementReady";
                    stagedContent[this.id].ui_state = "ready";
                }

                console.log(stagedContent);
            });
        }
    }

    //Load grid contents from manifest
    function LoadContentGrid() {

        for (var i = 0; i < 16; i++) {

            var id = "cb_" + i.toString().padStart(2, '0');
            if (stagedContent[id]) {
                var b = document.getElementById(id);

                if (b) {
                    b.className = "cueElementReady";
                    b.innerHTML = "<h2>" + getShortName(stagedContent[id].src) + "</h2>";

                    if (stagedContent[id].ui_state === "selected") {
                        b.className = "cueElementSelected";
                    }

                    if (stagedContent[id].type === "image") {
                        b.style.backgroundImage = 'url(' + stagedContent[id].src + ')';
                    }
                }

            }


        }

    }

    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */
    function initialize() {
        // Create own peer object with connection to shared PeerJS server
        peer = new Peer(process.env.HOST_ID, {
            host: process.env.PEERJS_SERVER,
            path: '/',
            secure: true,
            debug: 2
        });

        peer.on('open', function (id) {
            // Workaround for peer.reconnect deleting previous id
            if (peer.id === null) {
                console.log('Received null id from peer open');
                peer.id = lastPeerId;
            } else {
                lastPeerId = peer.id;
            }

            console.log('ID: ' + peer.id);
            hostID.innerHTML = "ID: " + peer.id;
            status.innerHTML = `Available connections: (${conn.length}/${process.env.MAX_PEERS})`;

            //load the content from manifest on server
            LoadWorkspace(LoadContentGrid);

        });
        peer.on('connection', function (c) {

            c.on('open', function () {
                // c.send("Sender does not accept incoming connections");
                // setTimeout(function() { c.close(); }, 500);
                if (conn.length < process.env.MAX_PEERS) {
                    conn.push(c);
                    c.send("Connected with host: " + peer.id);
                    addMessage("<span class=\"peerMsg\">Host:</span> Connected to: " + c.peer);
                    status.innerHTML = `Available connections: (${conn.length}/${process.env.MAX_PEERS})`;

                }
                else {
                    c.send("Host has reached max number of peers. Disconnecting...");
                    addMessage("<span class=\"peerMsg\">Host:</span> Connection from " + c.peer + " refused. Max peers reached.");
                    setTimeout(function () { c.close(); }, 500);
                }

            });

            c.on('close', function () {

                const index = conn.indexOf(c);
                if (index > -1) {
                    conn.splice(index, 1);
                }
                status.innerHTML = `Available connections: (${conn.length}/${process.env.MAX_PEERS})`;

            });


        });
        peer.on('disconnected', function () {
            status.innerHTML = "Connection lost. Please reconnect";
            console.log('Connection lost. Please reconnect');

            // Workaround for peer.reconnect deleting previous id
            peer.id = lastPeerId;
            peer._lastServerId = lastPeerId;
            peer.reconnect();
        });
        peer.on('close', function () {
            conn = [];
            status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
        });
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
    function signal(sigName) {
        if (conn && conn.open) {
            conn.send(sigName);
            console.log(sigName + " signal sent");
            addMessage(cueString + sigName);
        } else {
            console.log('Connection is closed');
        }
    }

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

        message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + message.innerHTML;
    };

    function clearMessages() {
        message.innerHTML = "";
        addMessage("Msgs cleared");
    };

    //Build content grid
    BuildContentGrid();

    // Listen for enter in message box
    sendMessageBox.addEventListener('keypress', function (e) {
        var event = e || window.event;
        var char = event.which || event.keyCode;
        if (char == '13')
            sendButton.click();
    });
    // Send message
    sendButton.addEventListener('click', function () {

        var msg = sendMessageBox.value;
        sendMessageBox.value = "";
        for (const c of conn) {
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
    clearMsgsButton.addEventListener('click', clearMessages);
    // Start peer connection on click
    // connectButton.addEventListener('click', join);

    playContentButton.addEventListener('click', function () {

        //send staged content to all connected peers
        for (const c of conn) {

            if (c && c.open) {

                var cue = {
                    type: "soundstage",
                    body: stagedContent
                }

                c.send(cue);
            } else {
                console.log('Connection is closed');
            }
        }

    });

    masterVolumeSlider.addEventListener("change", function(){

        masterVolumeLabel.innerHTML = "Vol: " + this.value;
        
        for (const c of conn) {

            if (c && c.open) {

                var cue = {
                    type: "master-volume",
                    body: {
                        volume: this.value
                    }
                }

                c.send(cue);
            } else {
                console.log('Connection is closed');
            }
        }

    })

    // Since all our callbacks are setup, start the process of obtaining an ID
    initialize();
}