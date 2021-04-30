import { nanoid } from "nanoid";
import Peer, * as peer from "peerjs"
import { CueType } from "./Cues";

class PeerHelper {

    constructor() {

    }

    sendObjectTransfromToHost(app, obj) {

        if (app.connection && app.connection.open) {

                var cue = {
                    type : CueType.PLAYERMOVE,
                    id : nanoid(10),
                    peer: app.peer.id,
                    objName: obj.name,
                    position: {
                        x : obj.position.x,
                        y : obj.position.y,
                        z : obj.position.z
                    },
                    scale: {
                        x : obj.scale.x,
                        y : obj.scale.y,
                        z : obj.scale.z
                    },
                    rotation: {
                        x : obj.rotation.x,
                        y : obj.rotation.y,
                        z : obj.rotation.z
                    },
                    color: {
                        r : app.profileColor.r,
                        g : app.profileColor.g,
                        b : app.profileColor.b
                    }
                }

                console.log("sending object move: " + cue);

                app.connection.send(cue);
            }

    }

    sendObjectTransformToPeers(app, params) {

        //send staged content to all connected peers
        console.log("sending object to peers");
        for (const c of app.conn) {

            if (c && c.open) {

                c.send(params);

            } else {
                console.log('Connection is closed');
            }
        }

    }

    initAsHost(app, id) {

        // Create own peer object with connection to shared PeerJS server
        app.peer = new Peer(process.env.HOST_ID, {
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
            app.hostID.innerHTML = "ID: " + app.peer.id;
            app.status.innerHTML = `Available connections: (${app.conn.length}/${process.env.MAX_PEERS})`;

            //load the content from manifest on server
            // LoadWorkspace(LoadContentGrid);

        });
        app.peer.on('connection', function (c) {

            c.on('open', function () {
                // c.send("Sender does not accept incoming connections");
                // setTimeout(function() { c.close(); }, 500);
                if (app.conn.length < process.env.MAX_PEERS) {
                    app.conn.push(c);
                    c.send("Connected with host: " + app.peer.id);
                    // addMessage("<span class=\"peerMsg\">Host:</span> Connected to: " + c.peer);
                    app.status.innerHTML = `Available connections: (${app.conn.length}/${process.env.MAX_PEERS})`;


                }
                else {
                    c.send("Host has reached max number of peers. Disconnecting...");
                    // addMessage("<span class=\"peerMsg\">Host:</span> Connection from " + c.peer + " refused. Max peers reached.");
                    setTimeout(function () { c.close(); }, 500);
                }

            });

            c.on('close', function () {

                const index = app.conn.indexOf(c);
                if (index > -1) {
                    app.conn.splice(index, 1);
                }
                app.status.innerHTML = `Available connections: (${app.conn.length}/${process.env.MAX_PEERS})`;

            });

            c.on('data', function (data) {

                console.log(data);

                if(data.type === CueType.PLAYERMOVE)
                {              
                    for (const oc of app.conn) {

                        if (oc && oc.open && oc !== c ) {

                            console.log("sending to: " + oc.peer)
                            oc.send(data);
                        } else {
                            console.log('Connection is closed');
                        }
                    }
                }

            });
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
            app.conn = [];
            app.status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        app.peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
        });

    }

    initAsPlayer(app, id) {
        // Create own peer object with connection to shared PeerJS server

        console.log("init as player...");
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

    }
}

export {
    PeerHelper
};