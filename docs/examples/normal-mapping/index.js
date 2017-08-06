const textures = [
        'statue',
        'couple',
        'head',
        'earth',
        'me',
        'cereal',
        'bricks',
        'suit',
        'reference',
        'shoes'
    ];
let currentTexture;
let texture = getParameterByName('texture');

if( texture !== null ) {
    const textureIndex = textures.findIndex( (_texture) => _texture === texture );
    if(textureIndex !== -1 ){
        currentTexture = textures[textureIndex];
    } else {
        // Default to statue if there was no texture with the name that was specified
        currentTexture = textures.find( (texture) => _texture === "statue" );
    }
} else {
    // Default to statue if no texture was specified via the get parameter
    currentTexture = textures.find( (texture) => texture === "statue" );
}

const navigation = document.getElementById('navigation');

textures.forEach( (texture) => {
    let a = document.createElement('a');

    a.href = `http://${location.host + location.pathname}?texture=${texture}`;
    a.innerHTML = `<img class="thumbnail" src="texture/${texture}-diffuse.png"/>`;
    navigation.appendChild(a);
})

Relight.create({
    container: document.getElementById('container'),
    diffuseTexture: `texture/${currentTexture}-diffuse.png`,
    normalsTexture: `texture/${currentTexture}-normals.png`,

    // The following are all optional
    width: 128,                         // Width / Height of canvas element
    height: 128,                        // Default is to use the diffuse textures dimensions

    lightDirection: [ 1.0, 0.0, 0.0 ],  // The initial light direction.
                                        // Default is [ 0, 0, 1 ]

    lightColor: [ 255, 255, 255],       // The initial directional light color.
                                        // Default is [ 255, 255, 255 ]

    ambientColor: [0, 0, 51],           // The color of the ambient light.
                                        // Default is black [ 0, 0, 0 ]
})
.then( (relight) => {
    /**
     *  Mouse move handler.
     *  Set light direction based on mouse position
     */
    let doCursorMove = ( x, y, reverseZ ) => {
        let radius = relight.canvas.width / 2.0,
            dx = x - relight.canvas.width / 2.0,
            dy = -(y - relight.canvas.height / 2.0),
            // Pretend the mouse is intersecting a sphere, it's height would be
            // where the mouse intersects the sphere
            distance2D = Math.sqrt(dx * dx + dy * dy);

        if ( distance2D > radius ) {
            distance2D = radius;
        }
        let dz = Math.sin(
                                Math.PI / 2.0 *
                                (radius - distance2D )/radius
                            ) * radius;

        let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            /*,
            dz =
            len = */
        if( len > 0.0 )
        {
            // normalize xy
            let s = 1.0 / len;
            dx *= s;
            dy *= s;
            dz *= s;
        }
        else
        {
            dx = 1.0;
            dy = 0.0;
            dz = 0.0;
        }
        relight.lightDirection[0] = dx;
        relight.lightDirection[1] = dy;
        relight.lightDirection[2] = reverseZ ? -dz: dz;

        drawLightArrow(relight.lightDirection);
    }

    let canvasPos = {x:0, y:0};	// Top left of canvas
    let rc = relight.canvas.getBoundingClientRect();
    canvasPos.x = rc.left;
    canvasPos.y = rc.top;

    //  Watch for mouse/finger movement
    document.body.addEventListener('mousemove', function(e) {
        doCursorMove( e.clientX - canvasPos.x, e.clientY - canvasPos.y , e.buttons===1 );
        e.preventDefault();
    });
    document.body.addEventListener('mouseup', function(e) {
        doCursorMove( e.clientX - canvasPos.x, e.clientY - canvasPos.y, e.buttons===1 );
        e.preventDefault();
    });
    document.body.addEventListener('mousedown', function(e) {
        doCursorMove( e.clientX - canvasPos.x, e.clientY - canvasPos.y, e.buttons===1 );
        e.preventDefault();
    });
    document.body.addEventListener('touchmove', function(e) {
        doCursorMove( e.changedTouches[0].clientX - canvasPos.x, e.changedTouches[0].clientY - canvasPos.y );
        e.preventDefault();
    });
    document.body.addEventListener('touchstart', function(e) {
        doCursorMove( e.changedTouches[0].clientX - canvasPos.x, e.changedTouches[0].clientY - canvasPos.y );
        e.preventDefault();
    });
});
