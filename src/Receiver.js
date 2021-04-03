import * as L from "leaflet"
import Peer, * as peer from "peerjs"
// import { Howl, Howler } from 'howler'
import * as Pizzicato from "pizzicato"

main();

function main() {

    var lastPeerId = null;
    var peer = null; // Own peer object
    var peerId = null;
    var conn = null;
    var recvId = document.getElementById("receiver-id");
    var status = document.getElementById("status");
    var message = document.getElementById("message");
    var sendMessageBox = document.getElementById("sendMessageBox");
    var sendButton = document.getElementById("sendButton");
    var clearMsgsButton = document.getElementById("clearMsgsButton");

    var recvIdInput = document.getElementById("host-id");
    var connectButton = document.getElementById("connect-button");

    var playerContent = document.getElementById("playerContent");

    var contentMap = {};

    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */
    function initialize() {
        // Create own peer object with connection to shared PeerJS server
        peer = new Peer(null, {
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
            recvId.innerHTML = "ID: " + peer.id;
            status.innerHTML = "Awaiting connection...";
        });
        peer.on('connection', function (c) {

            // Allow only a single connection
            if (conn && conn.open) {
                c.on('open', function () {
                    c.send("Already connected to another client");
                    setTimeout(function () { c.close(); }, 500);
                });
                return;
            }

            conn = c;
            console.log("Connected to: " + conn.peer);
            status.innerHTML = "Connected";
            ready();

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
            conn = null;
            status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
        });
    };

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

            contentMap[id] = params;
            contentMap[id].media = track;
            contentMap[id].effects[0] = stereoPanner;
            contentMap[id].effects[1] = reverb;
            contentMap[id].effects[2] = pingPongDelay;
            contentMap[id].content_state = "ready";

            //track stop
            contentMap[id].media.on("stop", function () {
                contentMap[id].content_state = "default";
            });

            //handle special case where sound needs to load and then play 
            if (params.ui_state === "selected") {
                contentMap[id].media.play();
                contentMap[id].content_state = "playing";
            }
        });
    }


    function UpdateSound(id, params) {

        contentMap[id].media.volume = parseFloat(params.volume);
        contentMap[id].media.attack = parseFloat(params.fade_in);
        contentMap[id].media.release = parseFloat(params.fade_out);
        contentMap[id].effects[0].pan = parseFloat(params.pan);
        contentMap[id].effects[1].time = parseFloat(params.reverb);
        contentMap[id].effects[2].mix = parseFloat(params.echo);
        contentMap[id].loop = parseFloat(params.loop) < 0.5 ? false : true;

        if (contentMap[id].content_state !== "playing") {
            contentMap[id].media.play();
            contentMap[id].content_state = "playing";
        }

    }



    /**
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    function ready() {
        conn.on('data', function (data) {
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
                    if (params.src == "" && contentMap[id]) {
                        if (contentMap[id].type === "audio") {
                            if (contentMap[id].media) {
                                contentMap[id].media.stop();
                            }
                        }

                        contentMap[id] = params;
                    }

                    if (params.type === "audio") {

                        if (!contentMap[id] || params.src != contentMap[id].src) {
                            LoadSound(id, params);
                        }

                        else if (params.ui_state === "selected") {
                            // contentMap[id].media.stop();
                            UpdateSound(id, params)

                        }

                        else if (params.ui_state === "ready") {
                            contentMap[id].media.stop();
                        }

                        else if (params.ui_state === "empty") {
                            contentMap[id] = params;
                        }

                    }

                    if (params.type === "image") {
                        // console.log(data[id]);
                        // playerContent.style.backgroundImage = 'url(' + params.src + ')';
                        if (params.ui_state === "selected") {
                            if (!contentMap[id] || params.src != contentMap[id].src) {
                                console.log("creating new video at: " + params.src);

                                var videoCue = document.getElementById("video-cue");

                                if (videoCue) {
                                    playerContent.removeChild(videoCue);
                                }

                                videoCue = document.createElement("img");
                                videoCue.className = "videoCue";
                                videoCue.src = params.src;
                                // videoCue.autoplay = true;
                                videoCue.id = "video-cue";

                                playerContent.appendChild(videoCue);

                                contentMap[id] = params;
                            }
                        }
                        else if (params.ui_state === "empty") {
                            var videoCue = document.getElementById("video-cue");

                            if (videoCue) {
                                playerContent.removeChild(videoCue);
                            }

                            contentMap[id] = null;
                        }
                    }

                    if (params.type === "video") {

                        if (params.ui_state === "selected") {
                            if (!contentMap[id] || params.src != contentMap[id].src) {
                                console.log("creating new video at: " + params.src);

                                var videoCue = document.getElementById("video-cue");

                                if (videoCue) {
                                    playerContent.removeChild(videoCue);
                                }

                                videoCue = document.createElement("video");
                                videoCue.className = "videoCue";
                                videoCue.src = params.src;
                                videoCue.autoplay = true;
                                videoCue.id = "video-cue";

                                playerContent.appendChild(videoCue);

                                contentMap[id] = params;
                            }
                        }

                        else if (params.ui_state === "empty") {
                            var videoCue = document.getElementById("video-cue");

                            if (videoCue) {
                                playerContent.removeChild(videoCue);
                            }

                            contentMap[id] = null;
                        }
                    }
                }
            }

        });
        conn.on('close', function () {
            status.innerHTML = "Connection reset<br>Awaiting connection...";
            conn = null;
        });
    }

    function join() {

        // Close old connection
        if (conn) {
            conn.close();
        }

        // Create connection to destination peer specified in the input field
        conn = peer.connect(recvIdInput.value, {
            reliable: true
        });

        conn.on('open', function () {
            status.innerHTML = "Connected to: " + conn.peer;
            console.log("Connected to: " + conn.peer);

            // Check URL params for comamnds that should be sent immediately
            var command = getUrlParam("command");
            if (command)
                conn.send(command);

            ready();
        });

        // Handle incoming data (messages only since this is the signal sender)
        conn.on('data', function (data) {
            addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
        });
        conn.on('close', function () {
            status.innerHTML = "Connection closed";
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

        message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + message.innerHTML;
    }

    function clearMessages() {
        message.innerHTML = "";
        addMessage("Msgs cleared");






    }

    // Listen for enter in message box
    sendMessageBox.addEventListener('keypress', function (e) {
        var event = e || window.event;
        var char = event.which || event.keyCode;
        if (char == '13')
            sendButton.click();
    });
    // Send message
    sendButton.addEventListener('click', function () {
        if (conn && conn.open) {
            var msg = sendMessageBox.value;
            sendMessageBox.value = "";
            conn.send(msg);
            console.log("Sent: " + msg)
            addMessage("<span class=\"selfMsg\">Self: </span>" + msg);
        } else {
            console.log('Connection is closed');
        }
    });

    // Clear messages box
    clearMsgsButton.addEventListener('click', clearMessages);

    connectButton.addEventListener('click', join);

    initialize();
}