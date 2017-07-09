

/*
 * Get the canvas and set it's size
 */
const canvas = document.getElementById('canvas');
  //
const WIDTH = 256;
const HEIGHT = WIDTH;
  // 
canvas.width = WIDTH * 2;
canvas.height = HEIGHT;

const ctx = canvas.getContext('2d');

/*
 * Convenience function to set a single pixel color on the canvas. 
 * Based off of this discussion: https://stackoverflow.com/a/4900656
 */ 
const id = ctx.createImageData(1,1);
const d  = id.data;
function setPixel( x, y, r, g, b, a ) {
    d[0]   = r;
    d[1]   = g;
    d[2]   = b;
    d[3]   = a;
    ctx.putImageData( id, x, y ); 
}

setPixel( 10, 10, 255, 0, 0, 255);


for(let y = 0; y < HEIGHT; y++){
    for(let x = 0; x < WIDTH; x++){
        const colorLeft = getNormalAsColor( x, y, false);
        setPixel(x, y, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3])

        const colorRight = getNormalAsColor( x, y, true);
        setPixel(x + WIDTH, y, colorRight[0], colorRight[1], colorRight[2], colorRight[3])
    }
}

function getNormal(x, y) {
    let radius = WIDTH / 2.0,
        dx = x - WIDTH / 2.0,
        dy = y - HEIGHT / 2.0,
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

    if( normal[0] === 0.0 && normal[1] === 0.0 && normal[0] === 0.0 ){
        return [128, 128, 128, 255];
    } else {
        return [
            Math.floor( (normal[0] + 1.0) / 2.0 * 255 ),
            Math.floor( (normal[1] + 1.0) / 2.0 * 255 ),
            Math.floor( (normal[2] + 1.0) / 2.0 * 255 ),
             255
        ];
    }
}