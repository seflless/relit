/**
 *  Sprite class
 *  An instance to be displayed on the screen.
 *  We can have many sprite instances sharing the same Quad definition.
 */
var Sprite = function( info )
{
	this.quad = info.quad || null;
	this.pos = {x:info.x, y:info.y};
	this.rot = info.rot || 0.0;
};