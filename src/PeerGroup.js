import Peer, * as peer from "peerjs"
import { SoundStage } from "./SoundStage.js";

class PeerGroup {

    /**
 * Constructor for a peer group.
 * @param {*} peerObj a sound to play
 * @param {*} peerGroupID the id
  */
    constructor() {

        var body = document.getElementById("peer-group");

        var startGroup = document.createElement("button");
        startGroup.innerHTML = "Start a Group";
        body.appendChild(startGroup);

        var joinGroup = document.createElement("button");
        joinGroup.innerHTML = "Join a Group";
        body.appendChild(joinGroup);

        var textInput = document.createElement('input');
        body.appendChild(textInput);


        var soundStage = new SoundStage();


        startGroup.addEventListener("click", function () {

            console.log("Starting new peer group...");

            var peer = new Peer('mini-dnd-iwd-host-123');

            // this.peerObj = new Peer('someid', {
            //     host: '192.168.2.127',
            //     port: 9000,
            //     path: '/myapp'
            //   });


             peer.on('open', function (id) {

                console.log('My peer ID is: ' + id);
                // Receive messages

                startGroup.innerHTML = id;
            });

            peer.on('error', function (err) {

                console.log(err);

            });

            peer.on('connection', function(conn){

                console.log('connection received from: ' + conn.peer);

                // Receive messages
                conn.on('data', function (data) {
                    console.log('Received', data);
                });

                conn.on('open', function () {
                    
                    document.addEventListener('keydown', function(e){

                        if(e.code === 'KeyS')
                        {
                            conn.send("Playing default sound now...");
                        }
                    });
                    
                });

            });

        });

        joinGroup.addEventListener("click", function () {

            // console.log(textInput.value);
            // this.peerGroupID = textInput.value;
            // console.log(this.peerGroupID);

            console.log("Connecting to existing peer group...");
 
            var otherPeer= new Peer();

            otherPeer.on('open', function (id) {

                console.log('My peer ID is: ' + id);
                // Receive messages

                startGroup.innerHTML = id;
            });

            var conn = otherPeer.connect('mini-dnd-iwd-host-123');


            conn.on('error', function (err) {

                console.log(err);

            });

            conn.on('open', function () {

                console.log('connection open');
                // Receive messages
                conn.on('data', function (data) {
                    console.log('Received', data);

                    if(data.includes("sound"))
                    {
                        console.log("playing default sound");
                        soundStage.playDefaultSound();
                    }
                });

                // Send messages
                conn.send('Hello!');
            });
        });

    }

    logKey(e) {

        if (e.code === 'KeyI') {

        }
        else if (e.code === 'KeyC') {

        }
        else if (e.code === 'KeyS') {

            

        }
    }
}



export { PeerGroup };