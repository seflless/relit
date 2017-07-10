/*
 * Takes an RGB color represented as an array of [r, g, b]. Each a value between 0 and 255.
 *   Note: This means dealing with alpha channels must be dealt with out of band.
 * 
 * Returns a normal represented as an array of [x,y,z]. Each value is between -1.0 and 1.0
 */
function toColor(normal){
    return [
        Math.floor( (normal[0] + 1.0) / 2.0 * 255 ),
        Math.floor( (normal[1] + 1.0) / 2.0 * 255 ),
        Math.floor( (normal[2] + 1.0) / 2.0 * 255 )
    ];
}

/*
 * Takes a normal represented as an array of [x,y,z]. Each value is between -1.0 and 1.0
 * 
 * Returns a color represented as an array of [r, g, b]. Each a value between 0 and 255.
 *   Note: This means dealing with alpha channels must be dealt with out of band.
 */
function toNormal(color){
    return [
        color[0] / 255.0 * 2.0 - 1.0,
        color[1] / 255.0 * 2.0 - 1.0,
        color[2] / 255.0 * 2.0 - 1.0
    ];
}