let {Quad} = require('./Quad');
let {Sprite} = require('./Sprite');
let {SpriteBatch} = require('./SpriteBatch');
let {
        vertexShaderSource,
        fragmentShaderSource,
        compileShader,
        makeShaderProgram
    } = require('./Shaders');

class Relight {
    static create(options){
        let relight = new Relight(options);

        return relight._initialize();
    }

    constructor( options ) {
        this.options = options;

        this.lightDirection = new Float32Array([
            this.options.lightDirection[0],
            this.options.lightDirection[1],
            this.options.lightDirection[2]
        ]);

        this.lightColor = new Float32Array([
            this.options.lightColor[0] / 255.0,
            this.options.lightColor[1] / 255.0,
            this.options.lightColor[2] / 255.0
        ]);
        this.ambientColor = new Float32Array([
            this.options.ambientColor[0] / 255.0,
            this.options.ambientColor[1] / 255.0,
            this.options.ambientColor[2] / 255.0
        ]);
    }

    _initialize() {
        return new Promise( (resolve) => {
            let gl = null;				// The WebGL object
            let canvas = null;			// The canvas element
            let shader = {				// Structure to hold shader stuff
                prog:null, attribs:null, uniforms:null
            };
            let texDiffuse = null;		// diffuse texture
            let texNormals = null;		// normal map texture
            let numTexturesLoaded = 0;	// counts # of textures loaded so we know when we're ready
            let batch = null;			// will be an instance of SpriteBatch class
            let monkeys = [];			// will be an array of monkey sprites to render
            let prevT = 0;				// previous frame timestamp (millisecs)

            this.canvas = document.createElement('canvas');
            this.canvas.width = 800;
            this.canvas.height = 800;

            this.options.container.appendChild(this.canvas);

            // Init WebGL...
            if( (gl = this.canvas.getContext("webgl")) )
                console.log("webgl context acquired");
            else if( (gl = this.canvas.getContext("experimental-webgl")) )
                console.log("experimental-webgl context acquired");
            else
            {
                console.error("Failed to acquire a WebGL context");
                alert("WebGL not available.");
                return;
            }

            this.gl = gl;

            // Compile shader scripts...
            const vertexShader = compileShader( gl, gl.createShader(gl.VERTEX_SHADER), vertexShaderSource );
            const fragmentShader = compileShader( gl, gl.createShader(gl.FRAGMENT_SHADER), fragmentShaderSource );
            if( !(shader.prog = makeShaderProgram( gl, vertexShader, fragmentShader ) ) )
            {
                alert("Failed to create shader program. Check console for errors.");
                return;
            }

            //  Activate the shader program
            gl.useProgram(shader.prog);

            //  Acquire shader attribs
            shader.attribs = {
                pos: gl.getAttribLocation(shader.prog, "aPosition"),
                rot: gl.getAttribLocation(shader.prog, "aRotation"),
                uv: gl.getAttribLocation(shader.prog, "aTexCoord")
            };

            //  Acquire shader uniforms
            shader.uniforms = {
                sceneWidth: gl.getUniformLocation(shader.prog, "uSceneWidth"),
                sceneHeight: gl.getUniformLocation(shader.prog, "uSceneHeight"),
                aspect: gl.getUniformLocation(shader.prog, "uAspect"),
                samplerD: gl.getUniformLocation(shader.prog, "uSamplerD"),
                samplerN: gl.getUniformLocation(shader.prog, "uSamplerN"),
                lightDir: gl.getUniformLocation(shader.prog, "uLightDir"),
                lightColor: gl.getUniformLocation(shader.prog, "uLightColor"),
                ambientColor: gl.getUniformLocation(shader.prog, "uAmbientColor")
            };

            // Start loading textures...
            texDiffuse = gl.createTexture();
            texNormals = gl.createTexture();
            let imgDiffuse = new Image();
            let imgNormals = new Image();
            imgDiffuse.onload = function() { onLoadedTexture(texDiffuse, imgDiffuse, gl.RGBA); };
            imgDiffuse.onerror = function() { alert("failed to load diffuse texture."); };
            imgNormals.onload = function() { onLoadedTexture(texNormals, imgNormals, gl.RGB); };
            imgNormals.onerror = function() { alert("failed to load normalmap texture."); };
            //  Set the img srcs AFTER the callbacks are assigned!

            imgDiffuse.src = `texture/${currentTexture}-diffuse.png`;
            imgNormals.src = `texture/${currentTexture}-normals.png`;
            //  Exiting for now. Execution resumes in onLoadedTexture when textures load.

            /**
             *  Callback on texture image load
             */
            let onLoadedTexture = ( tex, img, fmt ) => {
                gl.bindTexture(gl.TEXTURE_2D, tex);
                //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);  // required if no mipmaps?
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);	// gl.LINEAR for smooth texture scaling
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, img);
                ++numTexturesLoaded;
                if( numTexturesLoaded >= 2 )
                {
                    //  Final texture has loaded. Start er up!
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    startRenderLoop();
                }
            }

            /**
             *  Called when inits are successful and all assets have loaded
             */
            let startRenderLoop = () => {
                gl.disable(gl.CULL_FACE);
                gl.disable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                //gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.viewport(0, 0, this.canvas.width, this.canvas.height);

                //  Create a SpriteBatch
                batch = new SpriteBatch({
                    lightDir: this.lightDirection,
                    lightColor: this.lightColor,
                    ambientColor: this.ambientColor,
                    gl,
                    canvas: this.canvas,
                    bufsize: 240,	// Number of sprites to allocate for
                    shader: shader,
                    texture: texDiffuse,
                    normap: texNormals
                });

                let quad = new Quad({});
                let monkey, sprite;
                let x, y;

                //  Fill an array of monkeys, each with its own sprite instance
                monkeys = [];


                // Add a sprite to the batch
                sprite = new Sprite({
                    x:0,y:0, rot:0,
                    quad:quad
                });
                batch.addSprite(sprite);

                // Make an ad-hoc monkey object
                monkey = {
                    sprite:sprite,
                    rotVel:0//Math.random() * 4.0 - 2.0  // random rotational velocity
                };
                monkeys.push(monkey);

                //  Init the previous frame time
                prevT = Date.now();

                //  All inits and setup done! Start the animation loop..
                requestAnimationFrame(doFrame);

                resolve(this);
            }

            /**
             *  Render loop callback function
             */
            let doFrame = () => {
                let curT = Date.now();
                let dt = curT - prevT;
                if( dt > 100 )
                    dt = 100;	// sanity check - in case of extra long pause or sleep
                render();
                prevT = curT;  // remember timestamp for next frame
                requestAnimationFrame(doFrame);
            }

            /**
             *  Render everything - the SpriteBatch does all the work for us.
             */
            let render = () => {
                batch.render();
            }
        });
    }
}

module.exports = {
    Relight
};
