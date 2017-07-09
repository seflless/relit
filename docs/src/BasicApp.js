

let canvas = document.getElementById('canvas');
let gl = canvas.getContext('webgl');

gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
gl.clearDepth(1.0);                 // Clear everything
gl.enable(gl.DEPTH_TEST);           // Enable depth testing
gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

const fragmentShaderSource = `
void main(void) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
`;

const vertexShaderSource = `
attribute vec3 coordinate;

void main(void) {
    gl_Position = vec4(coordinate, 1.0);
}
`;

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

const vertexShader = compileShader( gl.createShader(gl.VERTEX_SHADER), vertexShaderSource );
const fragmentShader = compileShader( gl.createShader(gl.FRAGMENT_SHADER), fragmentShaderSource );
const shaderProgram = makeShaderProgram( vertexShader, fragmentShader );

//  Activate the shader program
gl.useProgram(shaderProgram);

function render(){
    //gl.clearColor( Math.random(), Math.random(), Math.random(), 1.0 );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    requestAnimationFrame(render);
}
requestAnimationFrame(render);