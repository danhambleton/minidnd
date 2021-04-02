
import * as Pizzicato from "pizzicato"
import aws from "aws-sdk"
import { nanoid } from 'nanoid'

class MediaStage {

    /**
 * Constructor for a MediaStage
 * 
 * .
 * @param {*} stagedContent dictionary of audio and visual content
 * @param {*} s3
  */
    constructor() {

        //init s3 connection
        s3 = new aws.S3({
            endpoint: process.env.SPACES_ENDPOINT,
            accessKeyId: process.env.SPACES_ACCESS_KEY,
            secretAccessKey: process.env.SPACES_SECRET_KEY,
        });

        //init content map
        for (var i = 0; i < 16; i++) {
            var id = "cb_" + i.toString().padStart(2, '0');
            var params = this.GetDefaultParams();
            stagedContent[id] = params;
        }

    }

    GetDefaultParams() {
        return {
            src: "",
            type: "",
            state: "none",
            media: null,
            effects: [],
            volume: 0.5,
            pan: 0.0,
            loop: 0,
            reverb: 0,
            fade_in: 1.0,
            fade_out: 1.0
        };
    }

    async LoadFromServer(path, callback) {
        // Add a file to a Space
        var params = {
            Bucket: process.env.SPACES_BUCKET,
            Key: path + "/manifest.json",

        };

        s3.getObject(params, function (err, data) {
            if (err) console.log(err, err.stack);
            else {

                var newContent = JSON.parse(data.Body);

                this.SetContent(newContent);

                console.log(stagedContent);

                callback();
            }
        });
    }

    async SaveToServer(path) {

        // Add a file to a Space
        var params = {
            Body: stagedContent,
            Bucket: process.env.SPACES_BUCKET,
            Key: path + "/manifest.json",
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

    InitializeSound(id, params) {
        var track = new Pizzicato.Sound({
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

            track.addEffect(stereoPanner);
            track.addEffect(reverb);
            track.volume = parseFloat(params.volume);
            track.loop = parseFloat(params.loop) < 0.5 ? false : true;
            track.attack = parseFloat(params.fade_in);
            track.release = parseFloat(params.fade_out);

            stagedContent[id].media = track;

            stagedContent[id].src = params.src;
            stagedContent[id].type = params.type;
            stagedContent[id].loop = params.loop;
            stagedContent[id].fade_in = params.fade_in;
            stagedContent[id].fade_out = params.fade_out;
            stagedContent[id].volume = params.volume;
            stagedContent[id].reverb = params.reverb;
            stagedContent[id].pan = params.pan;      
            stagedContent[id].effects[0] = stereoPanner;
            stagedContent[id].effects[1] = reverb;
            stagedContent[id].state = "ready";

            //track stop
            stagedContent[id].media.on("stop", function (){
                stagedContent[id].content_state = "ready";
            });
        });
    }

    ResetContent(newContent) {
        //remove old content?

        this.stagedContent = newContent;

        for (const id in this.stagedContent) {

            if (stagedContent[id].type === "audio") {
                this.InitializeSound(id);
            }

            else if (stagedContent[id].type === "image") {
                ///
                this.stagedContent[id].state = "ready";
            }

            else if (stagedContent[id].type === "video") {
                ///
                this.stagedContent[id].state = "ready";
            }

        }
    }

    UpdateParams(id, params)
    {
       if(this.stagedContent[id].type === "audio")
       {
            stagedContent[id].media.volume = parseFloat(params.volume);
            stagedContent[id].media.loop = parseFloat(params.loop) < 0.5 ? false : true;
            stagedContent[id].media.attack = parseFloat(params.fade_in);
            stagedContent[id].media.release = parseFloat(params.fade_out);
            stagedContent[id].effects[0].pan = parseFloat(params.pan);
            stagedContent[id].effects[1].time = parseFloat(params.reverb);
       }

        stagedContent[id].src = params.src;
        stagedContent[id].type = params.type;
        stagedContent[id].loop = params.loop;
        stagedContent[id].fade_in = params.fade_in;
        stagedContent[id].fade_out = params.fade_out;
        stagedContent[id].volume = params.volume;
        stagedContent[id].reverb = params.reverb;
        stagedContent[id].pan = params.pan;

    }

    UpdateContent(newContent) {

        for (const id in newContent) {
            
            if (this.stagedContent[id]) {

                var oldSrc = this.stagedContent[id];
                var newParams  = newContent[id];
                
                if (this.stagedContent[id].type === "audio") {

                    if(oldSrc != this.stagedContent[id].src)
                    {
                        this.InitializeSound(id, newParams);
                    }
                    else
                    {
                        this.UpdateParams(id, newParams);
                    }
                }

                else if (stagedContent[id].type === "image") {
                    ///
                    this.UpdateParams(id, newParams);
                    //this.stagedContent[id].state = "ready";
                }

                else if (stagedContent[id].type === "video") {
                    ///
                    this.UpdateParams(id, newParams);
                    //this.stagedContent[id].state = "ready";
                }

            }
        }
    }

    SetActive(activeIds) {
        for (const id in activeIds) {
            stagedContent[id].state = "active";
        }
    }

    PlayActive() {
        
        for (const id in stagedContent) {
            if (stagedContent[id].state === "active") {
                if (stagedContent[id].type === "audio") {

                    if(stagedContent[id].state === "ready")
                    {
                        stagedContent[id].play();
                        stagedContent[id].state = "playing";
                    }

                    if(stagedContent[id].state === "playing")
                    {
                        ///
                    }
 
                }
            }
        }
    }

    PlayOnce(activeId) {

    }

    StopAll() {

    }

    SetMasterVolume() {

    }

}



export {
    MediaStage

};