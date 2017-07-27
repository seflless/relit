var lightDirectionCanvas = document.getElementById('light-direction');
var lightDirectionCtx = lightDirectionCanvas.getContext('2d');

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

const textures = [
        'statue',
        'couple',
        'head',
        'earth',
        'me',
        'cereal',
        'bricks',
        'suit',     
        'reference'     
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