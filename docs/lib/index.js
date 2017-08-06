(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.arbitrary = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 *  Quad class
 *  pos represents the un-transformed vertex coordinates.
 *  uv represents the texture coordinates (source rect from texture & normal map)
 *  We could define different quads for different regions of a texture atlas
 */
var Quad = function (info) {
	this.pos = info.pos || [-1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0];
	this.uv = info.uv || [0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0];
};

module.exports = {
	Quad
};

},{}],2:[function(require,module,exports){
let { Quad } = require('./Quad');
let { Sprite } = require('./Sprite');
let { SpriteBatch } = require('./SpriteBatch');
let {
    vertexShaderSource,
    fragmentShaderSource,
    compileShader,
    makeShaderProgram
} = require('./Shaders');

class Relight {
    static create(options) {
        let relight = new Relight(options);

        return relight._initialize();
    }

    constructor(options) {
        this.options = options;

        this.lightDirection = new Float32Array([this.options.lightDirection[0], this.options.lightDirection[1], this.options.lightDirection[2]]);

        this.lightColor = new Float32Array([this.options.lightColor[0] / 255.0, this.options.lightColor[1] / 255.0, this.options.lightColor[2] / 255.0]);
        this.ambientColor = new Float32Array([this.options.ambientColor[0] / 255.0, this.options.ambientColor[1] / 255.0, this.options.ambientColor[2] / 255.0]);
    }

    _initialize() {
        return new Promise(resolve => {
            let gl = null; // The WebGL object
            let canvas = null; // The canvas element
            let shader = { // Structure to hold shader stuff
                prog: null, attribs: null, uniforms: null
            };
            let texDiffuse = null; // diffuse texture
            let texNormals = null; // normal map texture
            let numTexturesLoaded = 0; // counts # of textures loaded so we know when we're ready
            let batch = null; // will be an instance of SpriteBatch class
            let monkeys = []; // will be an array of monkey sprites to render
            let prevT = 0; // previous frame timestamp (millisecs)

            this.canvas = document.createElement('canvas');
            this.canvas.width = 800;
            this.canvas.height = 800;

            this.options.container.appendChild(this.canvas);

            // Init WebGL...
            if (gl = this.canvas.getContext("webgl")) console.log("webgl context acquired");else if (gl = this.canvas.getContext("experimental-webgl")) console.log("experimental-webgl context acquired");else {
                console.error("Failed to acquire a WebGL context");
                alert("WebGL not available.");
                return;
            }

            this.gl = gl;

            // Compile shader scripts...
            const vertexShader = compileShader(gl, gl.createShader(gl.VERTEX_SHADER), vertexShaderSource);
            const fragmentShader = compileShader(gl, gl.createShader(gl.FRAGMENT_SHADER), fragmentShaderSource);
            if (!(shader.prog = makeShaderProgram(gl, vertexShader, fragmentShader))) {
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
            imgDiffuse.onload = function () {
                onLoadedTexture(texDiffuse, imgDiffuse, gl.RGBA);
            };
            imgDiffuse.onerror = function () {
                alert("failed to load diffuse texture.");
            };
            imgNormals.onload = function () {
                onLoadedTexture(texNormals, imgNormals, gl.RGB);
            };
            imgNormals.onerror = function () {
                alert("failed to load normalmap texture.");
            };
            //  Set the img srcs AFTER the callbacks are assigned!

            imgDiffuse.src = `texture/${currentTexture}-diffuse.png`;
            imgNormals.src = `texture/${currentTexture}-normals.png`;
            //  Exiting for now. Execution resumes in onLoadedTexture when textures load.

            /**
             *  Callback on texture image load
             */
            let onLoadedTexture = (tex, img, fmt) => {
                gl.bindTexture(gl.TEXTURE_2D, tex);
                //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // required if no mipmaps?
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // gl.LINEAR for smooth texture scaling
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, img);
                ++numTexturesLoaded;
                if (numTexturesLoaded >= 2) {
                    //  Final texture has loaded. Start er up!
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    startRenderLoop();
                }
            };

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
                    bufsize: 240, // Number of sprites to allocate for
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
                    x: 0, y: 0, rot: 0,
                    quad: quad
                });
                batch.addSprite(sprite);

                // Make an ad-hoc monkey object
                monkey = {
                    sprite: sprite,
                    rotVel: 0 //Math.random() * 4.0 - 2.0  // random rotational velocity
                };
                monkeys.push(monkey);

                //  Init the previous frame time
                prevT = Date.now();

                //  All inits and setup done! Start the animation loop..
                requestAnimationFrame(doFrame);

                resolve(this);
            };

            /**
             *  Render loop callback function
             */
            let doFrame = () => {
                let curT = Date.now();
                let dt = curT - prevT;
                if (dt > 100) dt = 100; // sanity check - in case of extra long pause or sleep
                render();
                prevT = curT; // remember timestamp for next frame
                requestAnimationFrame(doFrame);
            };

            /**
             *  Render everything - the SpriteBatch does all the work for us.
             */
            let render = () => {
                batch.render();
            };
        });
    }
}

module.exports = {
    Relight
};

},{"./Quad":1,"./Shaders":3,"./Sprite":4,"./SpriteBatch":5}],3:[function(require,module,exports){
const vertexShaderSource = `
//  Textured, lit, normal mapped vert shader
precision mediump float;

attribute vec2 aPosition;		// 2D position
attribute vec2 aTexCoord;		// Texture & normal map coords
attribute float aRotation;		// Indicates rotation of sprite - must set for each vertex

uniform float uSceneWidth;		// Width, height of scene - used to transform
uniform float uSceneHeight;		//   world coords to normalized device coords.
uniform float uAspect;			// Aspect ratio of canvas
uniform vec3 uLightDir;			// Application can set desired light direction

varying vec2 vTexCoord;			// Passed through to frag shader
varying vec3 vLightDir;			// Compute transformed light dir for frag shader

void main(void)
{
    vTexCoord = aTexCoord;	// frag shader needs texcoord

    // Figure out light direction relative to this rotated vertex.
    // Simply rotate the light dir by negative vertex rotation.
    float cosR = cos(-aRotation);
    float sinR = sin(-aRotation);
    vLightDir.x = (uLightDir.x * cosR - uLightDir.y * sinR) * uAspect;  // correct for aspect ratio
    vLightDir.y = uLightDir.x * sinR + uLightDir.y * cosR;
    vLightDir.z = uLightDir.z;
    // Finally normalize it so the frag shader can use it without any further adjustments
    vLightDir = normalize(vLightDir);

    // Since we're working in 2D, we can do a simple 2D scale to normalized device coords (from -1..1)
    // (no need for a full blown proj/modelview matrix multiply)
    gl_Position.x = aPosition.x / uSceneWidth;
    gl_Position.y = aPosition.y / uSceneHeight;
    gl_Position.z = 0.5;  // z should be from 0..1
    gl_Position.w = 1.0;  // no perspective
}
`;

const fragmentShaderSource = `
//  Textured, lit, normal mapped frag shader
precision mediump float;

// uniforms from app
uniform sampler2D uSamplerD;	// diffuse texture map
uniform sampler2D uSamplerN;	// normal texture map
uniform vec3 uLightColor;		// directional light color
uniform vec3 uAmbientColor;		// ambient light color

// interpolated values from vertex shader
varying vec2 vTexCoord;
varying vec3 vLightDir;

void main()
{
    // get the color values from the texture and normalmap
    vec4 clrDiffuse = texture2D(uSamplerD, vTexCoord);
    vec3 clrNormal = texture2D(uSamplerN, vTexCoord).rgb;

    // scale & normalize the normalmap color to get a normal vector for this texel
    vec3 normal = normalize(clrNormal * 2.0 - 1.0);

    // Calc normal dot lightdir to get directional lighting value for this texel.
    // Clamp negative values to 0.
    vec3 litDirColor = uLightColor * max(dot(normal, vLightDir), 0.0);

    // add ambient light, then multiply result by diffuse tex color for final color
    vec3 finalColor = (uAmbientColor + litDirColor) * clrDiffuse.rgb;

    // finally apply alpha of texture for the final color to render
    gl_FragColor = vec4(finalColor, clrDiffuse.a);
}
`;

function compileShader(gl, sh, src) {
    gl.shaderSource(sh, src);
    gl.compileShader(sh);

    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        return null;
    }

    return sh;
}

function makeShaderProgram(gl, vshader, fshader) {
    let prog = gl.createProgram();
    gl.attachShader(prog, vshader);
    gl.attachShader(prog, fshader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Failed to link shader program:", gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

module.exports = {
    vertexShaderSource,
    fragmentShaderSource,
    compileShader,
    makeShaderProgram
};

},{}],4:[function(require,module,exports){
/**
 *  Sprite class
 *  An instance to be displayed on the screen.
 *  We can have many sprite instances sharing the same Quad definition.
 */
var Sprite = function (info) {
  this.quad = info.quad || null;
  this.pos = { x: info.x, y: info.y };
  this.rot = info.rot || 0.0;
};

module.exports = {
  Sprite
};

},{}],5:[function(require,module,exports){
/**
 *  Batch renderer class for normal-mapped sprites (quads)
 *  Allows individual position, rotation for each.
 *  Note that this Batch implementation must know about the shader,
 *  what its attribs and uniforms are.
 */
let SpriteBatch = function (info) {
	this.lightDir = info.lightDir;
	this.gl = info.gl;
	this.canvas = info.canvas;
	this.bufsize = info.bufsize || 16; // Number of sprites to allocate for
	this.shader = info.shader; // The shader to use for this layer
	this.texture = info.texture || null; // Texture
	this.normap = info.normap || null; // Normal Map
	this.arr_pos = new Float32Array(this.bufsize * 2 * 4); // Array of all sprite vertex positions
	this.arr_rot = new Float32Array(this.bufsize * 1 * 4); // Array of all sprite rotations
	this.arr_uv = new Float32Array(this.bufsize * 2 * 4); // Array of all sprite UVs
	this.arr_id = new Uint16Array(this.bufsize * 6); // Array of all indices
	this.subArr_pos = null; // These are the ranges of elements in the above arrays that we
	this.subArr_rot = null; //  will need to update and send to the card again.
	this.subArr_uv = null;

	//  Pre-fill index buffer as it will not change - all sprites have 6 indices (4 vtx shared for 2 tris)
	for (var i = 0; i < this.bufsize; ++i) {
		this.arr_id[i * 6 + 0] = i * 4 + 0;
		this.arr_id[i * 6 + 1] = i * 4 + 1;
		this.arr_id[i * 6 + 2] = i * 4 + 2;
		this.arr_id[i * 6 + 3] = i * 4 + 2;
		this.arr_id[i * 6 + 4] = i * 4 + 3;
		this.arr_id[i * 6 + 5] = i * 4 + 0;
	}

	this.sprites = new Array(); // Array of Sprites
	this.spritesChanged = false; // Check flag every frame - if changed, will need to re-fill buffers

	this.gl.useProgram(this.shader.prog);

	//  Enable the attributes
	this.gl.enableVertexAttribArray(this.shader.attribs.pos);
	this.gl.enableVertexAttribArray(this.shader.attribs.rot);
	this.gl.enableVertexAttribArray(this.shader.attribs.uv);

	//  Must fill with data. Setup vertex buffers...
	this.buf_pos = this.gl.createBuffer(); // GL vertex buffer position (xy)
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_pos);
	this.gl.vertexAttribPointer(this.shader.attribs.pos, 2, this.gl.FLOAT, false, 0, 0);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this.arr_pos, this.gl.DYNAMIC_DRAW);

	this.buf_rot = this.gl.createBuffer(); // GL vertex buffer rotation (r)
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_rot);
	this.gl.vertexAttribPointer(this.shader.attribs.rot, 1, this.gl.FLOAT, false, 0, 0);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this.arr_rot, this.gl.DYNAMIC_DRAW);

	this.buf_uv = this.gl.createBuffer(); // GL vertex buffer texcoord (uv)
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_uv);
	this.gl.vertexAttribPointer(this.shader.attribs.uv, 2, this.gl.FLOAT, false, 0, 0);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this.arr_uv, this.gl.DYNAMIC_DRAW);

	this.buf_id = this.gl.createBuffer(); // Array of all indices
	this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buf_id);
	this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.arr_id, this.gl.STATIC_DRAW);

	//  Initial uniform values
	const width = 1.0;
	const height = 1.0;
	this.gl.uniform1f(this.shader.uniforms.sceneWidth, width);
	this.gl.uniform1f(this.shader.uniforms.sceneHeight, height);
	this.gl.uniform1f(this.shader.uniforms.aspect, this.canvas.width / this.canvas.height);
	this.gl.uniform3fv(this.shader.uniforms.lightDir, this.lightDir);

	const ambient = 0.2;
	const light = 1.0;
	this.gl.uniform3fv(this.shader.uniforms.lightColor, info.lightColor);

	this.gl.uniform3fv(this.shader.uniforms.ambientColor, info.ambientColor);

	var e = this.gl.getError();
	if (e !== this.gl.NO_ERROR) console.error("GL error: " + e);
};

SpriteBatch.prototype.addSprite = function (sprite) {
	if (this.sprites.length >= this.bufsize) {
		// TODO: Should re-allocate larger arrays
		console.log("Can't add sprite - buffer full.");
		return;
	}

	this.sprites.push(sprite);
	// recompute the sub-array ranges
	var n = this.sprites.length;
	this.subArr_pos = this.arr_pos.subarray(0, n * 4 * 2);
	this.subArr_rot = this.arr_rot.subarray(0, n * 4 * 1);
	this.subArr_uv = this.arr_uv.subarray(0, n * 4 * 2);
	this.spritesChanged = true; // flags that we need to re-fill buffer data
};

SpriteBatch.prototype.removeSprite = function (sprite) {
	// find this sprite in our array and remove it
	var i = this.sprites.indexOf(sprite);
	if (i >= 0) {
		this.sprites.splice(i, 1);
		var n = this.sprites.length;
		this.subArr_pos = this.arr_pos.subarray(0, n * 4 * 2);
		this.subArr_rot = this.arr_uv.subarray(0, n * 4 * 1);
		this.subArr_uv = this.arr_uv.subarray(0, n * 4 * 2);
		this.spritesChanged = true;
	} else {
		console.error("Can't remove Sprite - not found in this Batch");
	}
};

SpriteBatch.prototype.removeAllSprites = function () {
	this.sprites = [];
	this.spritesChanged = false;
};

/**
 *  This function takes our "user-friendly" list of sprites with position & rotation values,
 *  and does the grunt work of filling vertex buffers with transformed coordinates.
 *  Though it might seem like a lot of work for javascript to be doing, computing a matrix for each
 *  sprite and only rendering one sprite at a time would be far less efficient!
 *  This way we can render all the sprites in one big batch.
 */
SpriteBatch.prototype.render = function () {
	var i,
	    num = this.sprites.length;
	if (num < 1) return; // nothing to render

	var i,
	    j,
	    o,
	    p,
	    x,
	    y,
	    r,
	    rc,
	    rs,
	    ap = this.arr_pos,
	    // shorthand for arrays - one less level of indirection
	ar = this.arr_rot,
	    uv = this.arr_uv,
	    sprite;

	//  Fill buffer with recomputed position, rotation vertices
	for (i = 0; i < num; ++i) {
		sprite = this.sprites[i];
		p = sprite.quad.pos;
		x = sprite.pos.x;
		y = sprite.pos.y;
		r = sprite.rot;
		rc = Math.cos(r);
		rs = Math.sin(r);

		// translate and rotate each of this quad's verticies by this sprite's pos & rot
		o = i * 2 * 4; // offset to vertex array
		ap[o + 0] = p[0] * rc - p[1] * rs + x;
		ap[o + 1] = p[0] * rs + p[1] * rc + y;
		ap[o + 2] = p[2] * rc - p[3] * rs + x;
		ap[o + 3] = p[2] * rs + p[3] * rc + y;
		ap[o + 4] = p[4] * rc - p[5] * rs + x;
		ap[o + 5] = p[4] * rs + p[5] * rc + y;
		ap[o + 6] = p[6] * rc - p[7] * rs + x;
		ap[o + 7] = p[6] * rs + p[7] * rc + y;

		// send through the rotation angle to be used by the normal map lighting calculation
		o = i * 4; // offset to rotation array
		for (j = 0; j < 4; ++j) ar[o + j] = r;
	}

	//  We only need to update texcoord buffer if sprites list changed
	if (this.spritesChanged) {
		for (i = 0; i < num; ++i) {
			p = this.sprites[i].quad.uv;
			o = i * 2 * 4; // offset to uv array
			uv[o + 0] = p[0];uv[o + 1] = p[1];
			uv[o + 2] = p[2];uv[o + 3] = p[3];
			uv[o + 4] = p[4];uv[o + 5] = p[5];
			uv[o + 6] = p[6];uv[o + 7] = p[7];
		}
	}

	this.gl.useProgram(this.shader.prog);

	// If the canvas were resized, we would need to update these values
	//var aspect = canvas.width / canvas.height;
	//this.gl.uniform1f(this.shader.uniforms.sceneWidth, 12.0 * aspect);
	//this.gl.uniform1f(this.shader.uniforms.sceneHeight, 12.0);
	//this.gl.uniform1f(this.shader.uniforms.aspect, aspect);

	//  Update the light direction (based on mouse position)
	this.gl.uniform3fv(this.shader.uniforms.lightDir, this.lightDir);

	//  Activate the diffuse texture
	this.gl.activeTexture(this.gl.TEXTURE0);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
	this.gl.uniform1i(this.shader.uniforms.samplerD, 0);

	//  Activate the normalmap texture
	this.gl.activeTexture(this.gl.TEXTURE1);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.normap);
	this.gl.uniform1i(this.shader.uniforms.samplerN, 1);

	//  Bind GL buffers, update with recomputed values...
	//  positions
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_pos);
	this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.subArr_pos);
	this.gl.vertexAttribPointer(this.shader.attribs.pos, 2, this.gl.FLOAT, false, 0, 0);

	//  rotations
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_rot);
	this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.subArr_rot);
	this.gl.vertexAttribPointer(this.shader.attribs.rot, 1, this.gl.FLOAT, false, 0, 0);

	//  texcoords
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_uv);
	//  Only update texcoord buffer data if sprites list changed
	if (this.spritesChanged) this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.subArr_uv);
	this.gl.vertexAttribPointer(this.shader.attribs.uv, 2, this.gl.FLOAT, false, 0, 0);

	//  indices
	this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buf_id);

	//  finally... draw!
	this.gl.drawElements(this.gl.TRIANGLES, num * 6, this.gl.UNSIGNED_SHORT, 0);

	this.spritesChanged = false; // reset this flag
};

module.exports = {
	SpriteBatch
};

},{}],6:[function(require,module,exports){
const { Relight } = require('./Relight');

module.exports = {
    Relight
};

if (window) {
    window.Relight = Relight;
}

},{"./Relight":2}]},{},[6])(6)
});
//# sourceMappingURL=index.js.map