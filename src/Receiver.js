import * as L from "leaflet"
import Peer, * as peer from "peerjs"
import { Howl, Howler } from 'howler';

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



    /**
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    function ready() {
        conn.on('data', function (data) {
            console.log("Data recieved");
            var cueString = "<span class=\"cueMsg\">Cue: </span>";

 

            //contentMap = data;

            for (var id in data) {

                var params = data[id];
                if (params.type === "audio") {
                    console.log(data[id]);
                    if (!contentMap[id]) {
                        console.log("creating new audio at: " + params.src);

                        var track = new Howl({
                            src: params.src,
                            volume: params.volume,
                            pan: params.pan
                        });

                        params.media = track;

                        contentMap[id] = params;

                    }

                    if (params.ui_state === "selected") {
                        contentMap[id].media.stop();
                        contentMap[id].media.play();
                        contentMap[id].media.volume = params.volume;
                        contentMap[id].media.pan = params.pan;

                    }

                    else if (params.ui_state === "ready") {
                        contentMap[id].media.stop();

                    }



                    contentMap[id] = params;

                }

                if (params.type === "image") {
                    console.log(data[id]);
                    playerContent.style.backgroundImage = 'url('+ params.src +')';
                }

                if (params.type === "video") {
                    //     if(!contentMap[data.src])
                    //     {
                    //         console.log("creating new video at: " + data.src);

                    //         var videoCue = document.createElement("video");
                    //         videoCue.className = "videoCue";
                    //         videoCue.src = data.src;
                    //         videoCue.autoplay = true;
                    //         videoCue.id = "video-cue";

                    //         playerContent.appendChild(videoCue);



                    //         var contentParams = {
                    //             type: "video",
                    //             state: "playing"
                    //         };

                    //         contentMap[data.src] = contentParams;
                    //     }

                    //     else
                    //     {
                    //         var videoCue = document.getElementById("video-cue");

                    //         if(videoCue)
                    //         {
                    //             playerContent.removeChild(videoCue);
                    //         }

                    //         contentMap[data.src] = null;
                    //     }
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

    function clearContent() {

        playerContent.style.backgroundImage = '';
        playerContent.style.background = 'black';

        //how to remove map?

        // if(mapInstance )
        // {
        //     mapInstance.remove();
        //     mapInstance = null;
        // }
    }

    function audioOneState() {

        clearContent();

        // audioOne.play();
        playerContent.style.background = 'green';

        return;
    };

    function audioTwoState() {

        clearContent();

        // audioTwo.play();
        playerContent.style.background = 'blue';


        return;
    };

    function imageOneState() {

        clearContent();

        playerContent.style.background = 'yellow';
        // playerContent.style.backgroundImage = 'url(assets/image/winter-scene.jpeg)';
        // playerContent.style.objectFit = 'scale';
        return;
    }

    function mapOneState() {

        clearContent();

        playerContent.style.background = 'orange';

        // var w = 33000;
        // var h = 33000;
        // var mapMinZoom = 2;
        // var mapMaxZoom = 7;
        // mapInstance = L.map('playerContent', {
        //   maxZoom: mapMaxZoom,
        //   minZoom: mapMinZoom,
        //   crs: L.CRS.Simple,
        //   zoomControl: true,
        //   wheelPxPerZoomLevel: 250,
        //   attributionControl: false,
        //   detectRetina: true
        // });

        // var _mapBounds = new L.LatLngBounds(
        //     mapInstance.unproject([0, h], mapMaxZoom),
        //   mapInstance.unproject([w, 0], mapMaxZoom));
        //   mapInstance.setMaxBounds(_mapBounds);

        // var _mapCenter = mapInstance.unproject([w / 2, h / 2], mapMaxZoom);
        // mapInstance.setView(_mapCenter, 2);

        // var _tileLayer = L.tileLayer(
        //   'assets/iwd-tiles-sq/{z}/{x}/{y}.png', {
        //   minZoom: mapMinZoom, maxZoom: mapMaxZoom,
        //   bounds: _mapBounds,
        //   continuousWorld: false,
        //   noWrap: true,
        //   tileSize: 250,
        //   crs: L.CRS.Simple,
        //   detectRetina: true
        // }).addTo(mapInstance);

        return;
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