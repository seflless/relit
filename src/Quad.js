/**
 *  Quad class
 *  pos represents the un-transformed vertex coordinates.
 *  uv represents the texture coordinates (source rect from texture & normal map)
 *  We could define different quads for different regions of a texture atlas
 */
var Quad = function( info )
{
	this.pos = info.pos || [
		-1.0,  1.0,
		-1.0, -1.0,
		 1.0, -1.0,
		 1.0,  1.0
	];
	this.uv = info.uv || [
		0.0, 0.0,
		0.0, 1.0,
		1.0, 1.0,
		1.0, 0.0
	];
};

module.exports = {
	Quad
};