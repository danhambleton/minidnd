import * as L from "leaflet"
import Peer, * as peer from "peerjs"
import {Howl, Howler} from 'howler';

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

    var playerContent = document.getElementById("playerContent");
    var mapInstance = null;

    //set up some the assets bound to the buttons
    //TODO: do this way better...
    var audioOne = new Howl({
        src: ['assets/audio/CreakyDoorOpenClose.mp3']
    });

    var audioTwo = new Howl({
        src: ['assets/audio/Snowstorm_Outside.mp3']
    });

    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */
     function initialize() {
        // Create own peer object with connection to shared PeerJS server
        peer = new Peer(null, {
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
                c.on('open', function() {
                    c.send("Already connected to another client");
                    setTimeout(function() { c.close(); }, 500);
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
        peer.on('close', function() {
            conn = null;
            status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
        });
    };

    /**
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    function ready() {
        conn.on('data', function (data) {
            console.log("Data recieved");
            var cueString = "<span class=\"cueMsg\">Cue: </span>";
            switch (data) {
                case 'audio-one':
                    audioOneState();
                    addMessage(cueString + data);
                    creakyDoor.play();
                    break;
                case 'audio-two':
                    audioTwoState();
                    addMessage(cueString + data);
                    break;
                case 'image-one':
                    imageOneState();
                    addMessage(cueString + data);
                    break;
                case 'map-one':
                    mapOneState();
                    addMessage(cueString + data);
                    break;
                default:
                    addMessage("<span class=\"peerMsg\">Peer: </span>" + data);
                    break;
            };
        });
        conn.on('close', function () {
            status.innerHTML = "Connection reset<br>Awaiting connection...";
            conn = null;
        });
    }

    function clearContent() {

        playerContent.style.backgroundImage = '';
        playerContent.style.background = 'black';
        
        //how to remove map?
        
        if(mapInstance )
        {
            mapInstance.remove();
        }
    }

    function audioOneState() {

        clearContent();
        
        audioOne.play();
        playerContent.style.background = 'green';

        return;
    };

    function audioTwoState() {

        clearContent();
        
        audioTwo.play();
        playerContent.style.background = 'blue';
        

        return;
    };

    function imageOneState() {

        clearContent();

        playerContent.style.background = 'yellow';
        playerContent.style.backgroundImage = 'url(assets/image/winter-scene.jpeg)';
        playerContent.style.objectFit = 'contain';
        return;
    }

    function mapOneState() {

        clearContent();
        
        playerContent.style.background = 'orange';

        var w = 33000;
        var h = 33000;
        var mapMinZoom = 2;
        var mapMaxZoom = 7;
        mapInstance = L.map('playerContent', {
          maxZoom: mapMaxZoom,
          minZoom: mapMinZoom,
          crs: L.CRS.Simple,
          zoomControl: true,
          wheelPxPerZoomLevel: 250,
          attributionControl: false,
          detectRetina: true
        });
      
        var _mapBounds = new L.LatLngBounds(
            mapInstance.unproject([0, h], mapMaxZoom),
          mapInstance.unproject([w, 0], mapMaxZoom));
          mapInstance.setMaxBounds(_mapBounds);
      
        var _mapCenter = mapInstance.unproject([w / 2, h / 2], mapMaxZoom);
        mapInstance.setView(_mapCenter, 2);
      
        var _tileLayer = L.tileLayer(
          'assets/iwd-tiles-sq/{z}/{x}/{y}.png', {
          minZoom: mapMinZoom, maxZoom: mapMaxZoom,
          bounds: _mapBounds,
          continuousWorld: false,
          noWrap: true,
          tileSize: 250,
          crs: L.CRS.Simple,
          detectRetina: true
        }).addTo(mapInstance);

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

    initialize();
}