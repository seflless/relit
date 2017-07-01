"use strict";

//
//  App Globals
//
var gl = null;				// The WebGL object
var canvas = null;			// The canvas element
var canvasPos = {x:0, y:0};	// Top left of canvas
var shader = {				// Structure to hold shader stuff
    prog:null, attribs:null, uniforms:null
};
var texDiffuse = null;		// diffuse texture
var texNormals = null;		// normal map texture
var numTexturesLoaded = 0;	// counts # of textures loaded so we know when we're ready
var batch = null;			// will be an instance of SpriteBatch class
var monkeys = [];			// will be an array of monkey sprites to render
var prevT = 0;				// previous frame timestamp (millisecs)
var lightDir = new Float32Array([0.7, 0.7, 0.7]);	// direction of light (update by mouse movements)

//
//  Utility/helper functions
//
function El(id)
{
    return document.getElementById(id);
}

// Cross-browser requestAnimationFrame
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
            window.setTimeout(callback, 1000/60);
        };
})();

function compileShader( sh, src )
{
    gl.shaderSource(sh, src);
    gl.compileShader(sh);

    if( !gl.getShaderParameter(sh, gl.COMPILE_STATUS) )
    {
        console.error( gl.getShaderInfoLog(sh) );
        return null;
    }

    return sh;
}

function getShaderById( id )
{
    var shaderScript = El(id);
    if( !shaderScript )
        return null;

    var str = "";
    var k = shaderScript.firstChild;
    while( k )
    {
        if( k.nodeType === 3 )
            str += k.textContent;
        k = k.nextSibling;
    }

    var sh;
    if( shaderScript.type === "x-shader/x-fragment" )
        sh = gl.createShader(gl.FRAGMENT_SHADER);
    else if ( shaderScript.type === "x-shader/x-vertex" )
        sh = gl.createShader(gl.VERTEX_SHADER);
    else
        return null;

    return compileShader(sh, str);
}

function makeShaderProgram ( vshader, fshader )
{
    var prog = gl.createProgram();
    gl.attachShader(prog, vshader);
    gl.attachShader(prog, fshader);
    gl.linkProgram(prog);
    if( !gl.getProgramParameter(prog, gl.LINK_STATUS) )
    {
        console.error("Failed to link shader program:", gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

///////////////////////////////////////////////////////////
/**
 *  Bootup function - Called after page loads
 *  Inits WebGL, shaders, starts textures loading.
 */
function init()
{
    if( gl ) return;  // already init'ed

    if( !(canvas = El('appcanvas')) )
    {
        alert("canvas element not found in page!");
        return;
    }

    // Init WebGL...
    if( (gl = canvas.getContext("webgl")) )
        console.log("webgl context acquired");
    else if( (gl = canvas.getContext("experimental-webgl")) )
        console.log("experimental-webgl context acquired");
    else
    {
        console.error("Failed to acquire a WebGL context");
        alert("WebGL not available.");
        return;
    }

    var rc = canvas.getBoundingClientRect();
    canvasPos.x = rc.left;
    canvasPos.y = rc.top;

    // Compile shader scripts...
    if( !(shader.prog = makeShaderProgram( getShaderById('nmap-vert'), getShaderById('nmap-frag'))) )
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
    var imgDiffuse = new Image();
    var imgNormals = new Image();
    imgDiffuse.onload = function() { onLoadedTexture(texDiffuse, imgDiffuse, gl.RGBA); };
    imgDiffuse.onerror = function() { alert("failed to load diffuse texture."); };
    imgNormals.onload = function() { onLoadedTexture(texNormals, imgNormals, gl.RGB); };
    imgNormals.onerror = function() { alert("failed to load normalmap texture."); };
    //  Set the img srcs AFTER the callbacks are assigned!
    imgDiffuse.src = 'texture/monkey-diffuse.png';
    imgNormals.src = 'texture/monkey-normals.png';
    //  Exiting for now. Execution resumes in onLoadedTexture when textures load.
}

/**
 *  Callback on texture image load
 */
function onLoadedTexture( tex, img, fmt )
{
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
        startApp();
    }
}

/**
 *  Called when inits are successful and all assets have loaded
 */
function startApp()
{
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, canvas.width, canvas.height);

    //  Create a SpriteBatch
    batch = new SpriteBatch({
        bufsize: 240,	// Number of sprites to allocate for
        shader: shader,
        texture: texDiffuse,
        normap: texNormals
    });

    var quad = new Quad({});
    var monkey, sprite;
    var x, y;

    //  Fill an array of monkeys, each with its own sprite instance
    monkeys = [];

    for( x = -16.0; x <= 16.0; x += 2.0 )
    {
        for( y = -12.0; y <= 12.0; y += 2.0 )
        {
            // Add a sprite to the batch
            sprite = new Sprite({
                x:x, y:y, rot:0,
                quad:quad
            });
            batch.addSprite(sprite);

            // Make an ad-hoc monkey object
            monkey = {
                sprite:sprite,
                rotVel:0//Math.random() * 4.0 - 2.0  // random rotational velocity
            };
            monkeys.push(monkey);
        }
    }

    //  Watch for mouse/finger movement
    canvas.addEventListener('mousemove', function(e) {
        doCursorMove( e.clientX - canvasPos.x, e.clientY - canvasPos.y );
        e.preventDefault();
    });
    canvas.addEventListener('touchmove', function(e) {
        doCursorMove( e.changedTouches[0].clientX - canvasPos.x, e.changedTouches[0].clientY - canvasPos.y );
        e.preventDefault();
    });
    canvas.addEventListener('touchstart', function(e) {
        doCursorMove( e.changedTouches[0].clientX - canvasPos.x, e.changedTouches[0].clientY - canvasPos.y );
        e.preventDefault();
    });

    //  Init the previous frame time
    prevT = Date.now();

    //  All inits and setup done! Start the animation loop..
    requestAnimFrame(doFrame);
}

/**
 *  Mouse move handler.
 *  Set light direction based on mouse position
 */
function doCursorMove( x, y )
{
    var dx = x - canvas.width / 2.0,
        dy = -(y - canvas.height / 2.0),
        len = Math.sqrt(dx * dx + dy * dy);
    if( len > 0.0 )
    {
        // normalize xy
        var s = 1.0 / len;
        dx *= s;
        dy *= s;
    }
    else
    {
        dx = 1.0;
        dy = 0.0;
    }
    lightDir[0] = dx;
    lightDir[1] = dy;
    //lightDir[2] = 0.0;
}

/**
 *  Render loop callback function
 */
function doFrame()
{
    var curT = Date.now();
    var dt = curT - prevT;
    if( dt > 100 )
        dt = 100;	// sanity check - in case of extra long pause or sleep
    update(dt);
    render();
    prevT = curT;  // remember timestamp for next frame
    requestAnimFrame(doFrame);
}

/**
 *  Render everything - the SpriteBatch does all the work for us.
 */
function render()
{
    batch.render();
}

/**
 *  Update logic by elapsed time
 */
function update( dt )
{
    var ft = dt * 0.001;	// convert delta T to seconds
    var monkey, i, n = monkeys.length;
    // update each monkey
    for( i = 0; i < n; ++i )
    {
        monkey = monkeys[i];
        // spin the monkey using its own rotational velocity
        monkey.sprite.rot += ft * monkey.rotVel;
    }
}

init();