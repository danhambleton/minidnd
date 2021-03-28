import * as L from "leaflet"
import Peer, * as peer from "peerjs"
import { setupDragAndDrop } from "./DragAndDrop.js"
import aws from "aws-sdk"
import { Howl } from "howler";

main();

function main() {

    var lastPeerId = null;
    var peer = null; // own peer object
    var conn = new Array();
    var hostID = document.getElementById("host-id");
    var status = document.getElementById("status");
    var message = document.getElementById("message");

    var sendMessageBox = document.getElementById("sendMessageBox");
    var sendButton = document.getElementById("sendButton");
    var clearMsgsButton = document.getElementById("clearMsgsButton");
    // var connectButton = document.getElementById("connect-button");
    var cueString = "<span class=\"cueMsg\">Cue: </span>";

    var stagingArea = document.getElementById("stagedContent");

    var soundStage = {};

    const s3 = new aws.S3({
        endpoint: process.env.SPACES_ENDPOINT,
        accessKeyId: process.env.SPACES_ACCESS_KEY,
        secretAccessKey: process.env.SPACES_SECRET_KEY,
      });

    async function UploadAsset(event) 
    {
        
        let dataTransfer = event.dataTransfer;
        let files = dataTransfer.files;
        let asset = files[0];

        // Add a file to a Space
        var params = {
            Body: asset,
            Bucket: process.env.SPACES_BUCKET,
            Key: "assets/audio/" + files[0].name,
            ACL: 'public-read'
        };

        event.srcElement.innerHTML = "<h2>Uploading</h2>";

        s3.putObject(params, function(err, data) {
            if (err) console.log(err, err.stack);
            else     
            {
                console.log(data);
                event.srcElement.className = "cueElementReady";
                event.srcElement.innerHTML = "<h2>" + params.Key.split(/(\\|\/)/g).pop() + "</h2>";

                //set up audio for this element

                var url = "https://" + process.env.SPACES_BUCKET + "." + process.env.SPACES_ENDPOINT + "/" + params.Key;

                var contentParams = {
                    src: url,
                    type: "audio",
                    cmd: "play"
                }

                //TODO: super janky. Needs waaay better file extensions filtering.
                if(params.Key.split('.').pop() === "webm")
                {
                    contentParams.type = "video";
                }

                event.srcElement.addEventListener('click', function(){

                    console.log(contentParams);

                    for(const c of conn)
                    {
                        c.send(contentParams);
                    }

                });
            }
        });
    }

    var stagingArea = document.getElementById("contentGrid");
    for(var i = 0; i < 16; i++)
    {
        var b = document.createElement("button");
        b.className = "cueElementEmpty";
        stagingArea.appendChild(b);

        // Set up drag-and-drop for the active area
        setupDragAndDrop(b, UploadAsset);   
    }


    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */
    function initialize() {
        // Create own peer object with connection to shared PeerJS server
        peer = new Peer(null, {
            host: '9000-plum-barnacle-sgs4697k.ws-us03.gitpod.io',
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
        });
        peer.on('connection', function (c) {
            
            c.on('open', function() {
                // c.send("Sender does not accept incoming connections");
                // setTimeout(function() { c.close(); }, 500);
                if(conn.length < process.env.MAX_PEERS)
                {
                    conn.push(c);
                    c.send("Connected with host: " + peer.id);
                    addMessage("<span class=\"peerMsg\">Host:</span> Connected to: " + c.peer);
                    status.innerHTML = `Available connections: (${conn.length}/${process.env.MAX_PEERS})`;

                }
                else
                {
                    c.send("Host has reached max number of peers. Disconnecting...");
                    addMessage("<span class=\"peerMsg\">Host:</span> Connection from " + c.peer + " refused. Max peers reached.");
                    setTimeout(function() { c.close(); }, 500);
                }

            });

            c.on('close', function() {

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
        peer.on('close', function() {
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
        for(const c of conn)
        {
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

    // Since all our callbacks are setup, start the process of obtaining an ID
    initialize();
}