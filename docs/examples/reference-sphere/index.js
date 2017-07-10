
// Time the whole reference image generation process
const startTime = performance.now();

/*
 * Get the canvas and set it's size
 */
const normalsCanvas = document.getElementById('normals-canvas');
const diffuseCanvas = document.getElementById('diffuse-canvas');
  //
const WIDTH = 512;
const DOUBLE_WIDTH = WIDTH * 2;
const HEIGHT = WIDTH;

document.body.style.width = DOUBLE_WIDTH + 'px';

  // 
diffuseCanvas.width = normalsCanvas.width = WIDTH * 2;
diffuseCanvas.height = normalsCanvas.height = HEIGHT;

const normalsCtx = normalsCanvas.getContext('2d');
const diffuseCtx = diffuseCanvas.getContext('2d');

const diffuseId = diffuseCtx.createImageData(DOUBLE_WIDTH,HEIGHT);
const diffuseData  = diffuseId.data;
function setDiffusePixel( x, y, r, g, b, a ) {
    diffuseData[ (y*DOUBLE_WIDTH+x) * 4 + 0 ] = r;
    diffuseData[ (y*DOUBLE_WIDTH+x) * 4 + 1 ] = g;
    diffuseData[ (y*DOUBLE_WIDTH+x) * 4 + 2 ] = b;
    diffuseData[ (y*DOUBLE_WIDTH+x) * 4 + 3 ] = a;
}

const normalsId = normalsCtx.createImageData(DOUBLE_WIDTH,HEIGHT);
const normalsData  = normalsId.data;
function setNormalsPixel( x, y, r, g, b, a ) {
    normalsData[ (y*DOUBLE_WIDTH+x) * 4 + 0 ] = r;
    normalsData[ (y*DOUBLE_WIDTH+x) * 4 + 1 ] = g;
    normalsData[ (y*DOUBLE_WIDTH+x) * 4 + 2 ] = b;
    normalsData[ (y*DOUBLE_WIDTH+x) * 4 + 3 ] = a;
}


for(let y = 0; y < HEIGHT; y++){
    for(let x = 0; x < WIDTH; x++){
        const normalsColorLeft = getNormalAsColor( x, y, false);
        setNormalsPixel(x, y, normalsColorLeft[0], normalsColorLeft[1], normalsColorLeft[2], normalsColorLeft[3])

        const normalsColorRight = getNormalAsColor( x, y, true);
        setNormalsPixel(x + WIDTH, y, normalsColorRight[0], normalsColorRight[1], normalsColorRight[2], normalsColorRight[3])

        const diffuseColor = getDiffuseColor( x, y);
        setDiffusePixel(x, y, diffuseColor[0], diffuseColor[1], diffuseColor[2], diffuseColor[3])
        setDiffusePixel(x + WIDTH, y, diffuseColor[0], diffuseColor[1], diffuseColor[2], diffuseColor[3])
    }
}

diffuseCtx.putImageData( diffuseId, 0, 0 );
normalsCtx.putImageData( normalsId, 0, 0 );

function getDiffuseColor(x, y){
    let radius = WIDTH / 2.0,
        dx = x - WIDTH / 2.0,
        dy = y - HEIGHT / 2.0,
        // Pretend the mouse is intersecting a sphere, if it hits it, it's white
        // otherwise it's a fully transparent black
        distance2D = Math.sqrt(dx * dx + dy * dy);
    if(distance2D > radius){
        return [ 0, 0, 0, 0 ];
    } else {
        return [ 255, 255, 255, 255 ];
    }
}

function getNormal(x, y) {
    let radius = WIDTH / 2.0,
        dx = x - WIDTH / 2.0,
        // Normal maps are usually rendered with y going up, not down as in 2D graphics programming, 
        // hence this flips the y deltate unlike the x delta
        dy = -(y - HEIGHT / 2.0),
        // Pretend the mouse is intersecting a sphere, it's height would be 
        // where the mouse intersects the sphere
        distance2D = Math.sqrt(dx * dx + dy * dy);

    if( distance2D > radius ) {
        return [0.0, 0.0, 0.0];
    } else {
        let   dz = Math.sin( 
                            Math.PI / 2.0 *
                            (radius - distance2D )/radius
                        ) * radius;

        const   len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if( len > 0.0 ) {
            // normalize normal
            const s = 1.0 / len;
            dx *= s;
            dy *= s;
            dz *= s;
            return [dx, dy, dz];
        }
        // Coordinate must be exactly on top of the center of the virtual sphere 
        else {
            return [1.0, 0.0, 0.0];
        }
    }
}

function getNormalAsColor( x, y, reverseZ ) {
    const normal = getNormal( x, y );

    if( reverseZ ) {
        normal[2] = -normal[2];
    }

    let color;
    if( normal[0] === 0.0 && normal[1] === 0.0 && normal[0] === 0.0 ){
        color = toColor( [ 0.0, 0.0, 0.0 ] )
    } else {
        color = toColor(normal);    
    }

    return [
        color[0],
        color[1],
        color[2],
        255
    ];
}

/* 
 * Make it so clicking the wrapper anchor for each canvas initiates a download
 * of that canvas as a PNG
 */
document.querySelectorAll('a').forEach( (a) => {
    a.addEventListener('click', (event) => {
        // target is it's child element the canvas it wraps
        a.href = event.target.toDataURL('image/png');
    })
})

const totalTimeInSeconds = (performance.now() - startTime)/1000;
console.log( `Generation took ${totalTimeInSeconds.toFixed(1)}s`);