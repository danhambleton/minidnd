import aws from "aws-sdk"
import * as THREE from "three";
import * as MapShaders from "./MapShaders.js";

class Map {

    /**
 * Constructor for a MediaStage
 * 
 * .
 * @param {*} s3
  */
    constructor(container) {

        //init s3 connection
        this.s3 = new aws.S3({
            endpoint: process.env.SPACES_ENDPOINT,
            accessKeyId: process.env.SPACES_ACCESS_KEY,
            secretAccessKey: process.env.SPACES_SECRET_KEY,
        });

        //init threejs
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, container.offsetWidth / container.offsetHeight, 0.1, 100 );

        console.log(container.offsetWidth);

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( container.offsetWidth, container.offsetHeight );
        container.appendChild( renderer.domElement );

        // instantiate a loader
        const loader = new THREE.TextureLoader();

        // load a resource
        loader.load(
            // resource URL
            'https://danbleton.nyc3.digitaloceanspaces.com/circle-of-fire-and-grace/sunblight-keep.png',

            // onLoad callback
            function ( texture ) {
                // // in this example we create the material when the texture is loaded
                // const material = new THREE.MeshBasicMaterial( {
                //     map: texture
                // } );

                // const geometry = new THREE.BoxGeometry();
                // const cube = new THREE.Mesh( geometry, material );
                // scene.add( cube );
        
                // camera.position.z = 5;

                var quad = new THREE.Mesh(
                    new THREE.PlaneGeometry(2, 2),
                    new THREE.ShaderMaterial({
                      vertexShader: MapShaders.buildMapVertexShader(),
                      fragmentShader: MapShaders.buildMapFragmentShader(),
                      depthWrite: false,
                      depthTest: false,
                      uniforms: {
                        baseMap: { type: "t", value: texture }
                      },
                    })
                  );
                  scene.add(quad);

                function animate() {
                    
                    requestAnimationFrame( animate );

                    // cube.rotation.x += 0.005;
                    // cube.rotation.y += 0.01;
            
                    renderer.render( scene, camera );
            
                }

                animate();
        
            },

            // onProgress callback currently not supported
            undefined,

            // onError callback
            function ( err ) {
                console.error( 'An error happened.' );
            }
        );

 


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



}



export {
    Map

};