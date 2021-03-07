import {Howl, Howler} from 'howler';

class SoundStage {

      /**
   * Constructor for a SoundStage.
   * @param {*} soundA a sound to play
    */
    constructor(){

        //set up some sounds
        this.soundA = new Howl({
            src: ['assets/audio/CreakyDoorOpenClose.mp3']
        });

    }

    logKey(e) {
        console.log(e.code);
        this.soundA.play();
    }
}



export { SoundStage };