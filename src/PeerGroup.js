import Peer, * as peer from "peerjs"

class PeerGroup {

      /**
   * Constructor for a peer group.
   * @param {*} peerObj a sound to play
   * @param {*} peerGroupID the id
    */
    constructor(){

        // 1. Create the button
        var button = document.createElement("button");
        button.innerHTML = "Start or Join Peer Group";
        var textInput = document.createElement('input');

        // 2. Append somewhere
        var body = document.getElementById("peer-group");
        body.appendChild(button);
        body.appendChild(textInput);


        // 3. Add event handler
        button.addEventListener ("click", function() {

                if(this.peerGroupID = textInput.value === '')
                {
                    console.log("Starting new peer group...");
                    this.peerObj = new Peer();
    
                    this.peerObj.on('open', function(id) {
                        console.log('My peer ID is: ' + id);
                    });
                }
                else {

                    var conn = this.peerObj.connect(this.peerGroupID);

                    conn.on('open', function() {
                        // Receive messages
                        conn.on('data', function(data) {
                          console.log('Received', data);
                        });
                      
                        // Send messages
                        conn.send('Hello!');
                      });

                }

            

        });

        textInput.addEventListener("change", function() {

            console.log(textInput.value);
            this.peerGroupID = textInput.value;
        });

    }

    logKey(e) {

        if(e.code === 'KeyI')
        {

        }
        else if(e.code === 'KeyC')
        {

        }
        else if(e.code === 'KeyS')
        {

        }
    }
}



export { PeerGroup };