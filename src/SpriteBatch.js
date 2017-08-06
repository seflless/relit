/**
 *  Batch renderer class for normal-mapped sprites (quads)
 *  Allows individual position, rotation for each.
 *  Note that this Batch implementation must know about the shader,
 *  what its attribs and uniforms are.
 */
let SpriteBatch = function( info )
{
	this.lightDir = info.lightDir;
	this.gl = info.gl;
	this.canvas = info.canvas;
	this.bufsize = info.bufsize || 16;		// Number of sprites to allocate for
	this.shader = info.shader;				// The shader to use for this layer
	this.texture = info.texture || null;	// Texture
	this.normap = info.normap || null;		// Normal Map
	this.arr_pos = new Float32Array(this.bufsize * 2 * 4);	// Array of all sprite vertex positions
	this.arr_rot = new Float32Array(this.bufsize * 1 * 4);	// Array of all sprite rotations
	this.arr_uv = new Float32Array(this.bufsize * 2 * 4);	// Array of all sprite UVs
	this.arr_id = new Uint16Array(this.bufsize * 6);		// Array of all indices
	this.subArr_pos = null;		// These are the ranges of elements in the above arrays that we
	this.subArr_rot = null;		//  will need to update and send to the card again.
	this.subArr_uv = null;

	//  Pre-fill index buffer as it will not change - all sprites have 6 indices (4 vtx shared for 2 tris)
	for( var i = 0; i < this.bufsize; ++i )
	{
		this.arr_id[i * 6 + 0] = i * 4 + 0;
		this.arr_id[i * 6 + 1] = i * 4 + 1;
		this.arr_id[i * 6 + 2] = i * 4 + 2;
		this.arr_id[i * 6 + 3] = i * 4 + 2;
		this.arr_id[i * 6 + 4] = i * 4 + 3;
		this.arr_id[i * 6 + 5] = i * 4 + 0;
	}

	this.sprites = new Array();				// Array of Sprites
	this.spritesChanged = false;			// Check flag every frame - if changed, will need to re-fill buffers

	this.gl.useProgram(this.shader.prog);

	//  Enable the attributes
	this.gl.enableVertexAttribArray(this.shader.attribs.pos);
	this.gl.enableVertexAttribArray(this.shader.attribs.rot);
	this.gl.enableVertexAttribArray(this.shader.attribs.uv);

	//  Must fill with data. Setup vertex buffers...
	this.buf_pos = this.gl.createBuffer();		// GL vertex buffer position (xy)
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_pos);
	this.gl.vertexAttribPointer(this.shader.attribs.pos, 2, this.gl.FLOAT, false, 0, 0);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this.arr_pos, this.gl.DYNAMIC_DRAW);

	this.buf_rot = this.gl.createBuffer();		// GL vertex buffer rotation (r)
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_rot);
	this.gl.vertexAttribPointer(this.shader.attribs.rot, 1, this.gl.FLOAT, false, 0, 0);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this.arr_rot, this.gl.DYNAMIC_DRAW);

	this.buf_uv = this.gl.createBuffer();		// GL vertex buffer texcoord (uv)
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf_uv);
	this.gl.vertexAttribPointer(this.shader.attribs.uv, 2, this.gl.FLOAT, false, 0, 0);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this.arr_uv, this.gl.DYNAMIC_DRAW);

	this.buf_id = this.gl.createBuffer();		// Array of all indices
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
	if( e !== this.gl.NO_ERROR )
		console.error("GL error: "+e);
};

SpriteBatch.prototype.addSprite = function( sprite )
{
	if( this.sprites.length >= this.bufsize )
	{
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
	this.spritesChanged = true;	// flags that we need to re-fill buffer data
};

SpriteBatch.prototype.removeSprite = function( sprite )
{
	// find this sprite in our array and remove it
	var i = this.sprites.indexOf(sprite);
	if( i >= 0 )
	{
		this.sprites.splice(i, 1);
		var n = this.sprites.length;
		this.subArr_pos = this.arr_pos.subarray(0, n * 4 * 2);
		this.subArr_rot = this.arr_uv.subarray(0, n * 4 * 1);
		this.subArr_uv = this.arr_uv.subarray(0, n * 4 * 2);
		this.spritesChanged = true;
	}
	else
	{
		console.error("Can't remove Sprite - not found in this Batch");
	}
};

SpriteBatch.prototype.removeAllSprites = function()
{
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
SpriteBatch.prototype.render = function()
{
	var i,
		num = this.sprites.length;
	if( num < 1 )
		return;	// nothing to render

	var i, j, o,
		p, x, y, r,
		rc, rs,
		ap = this.arr_pos,	// shorthand for arrays - one less level of indirection
		ar = this.arr_rot,
		uv = this.arr_uv,
		sprite;

	//  Fill buffer with recomputed position, rotation vertices
	for( i = 0; i < num; ++i )
	{
		sprite = this.sprites[i];
		p = sprite.quad.pos;
		x = sprite.pos.x;
		y = sprite.pos.y;
		r = sprite.rot;
		rc = Math.cos(r);
		rs = Math.sin(r);

		// translate and rotate each of this quad's verticies by this sprite's pos & rot
		o = i * 2 * 4;  // offset to vertex array
		ap[o+0] = p[0] * rc - p[1] * rs + x;
		ap[o+1] = p[0] * rs + p[1] * rc + y;
		ap[o+2] = p[2] * rc - p[3] * rs + x;
		ap[o+3] = p[2] * rs + p[3] * rc + y;
		ap[o+4] = p[4] * rc - p[5] * rs + x;
		ap[o+5] = p[4] * rs + p[5] * rc + y;
		ap[o+6] = p[6] * rc - p[7] * rs + x;
		ap[o+7] = p[6] * rs + p[7] * rc + y;

		// send through the rotation angle to be used by the normal map lighting calculation
		o = i * 4;  // offset to rotation array
		for( j = 0; j < 4; ++j )
			ar[o+j] = r;
	}

	//  We only need to update texcoord buffer if sprites list changed
	if( this.spritesChanged )
	{
		for( i = 0; i < num; ++i )
		{
			p = this.sprites[i].quad.uv;
			o = i * 2 * 4;  // offset to uv array
			uv[o+0] = p[0]; uv[o+1] = p[1];
			uv[o+2] = p[2]; uv[o+3] = p[3];
			uv[o+4] = p[4]; uv[o+5] = p[5];
			uv[o+6] = p[6]; uv[o+7] = p[7];
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
	if( this.spritesChanged )
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.subArr_uv);
	this.gl.vertexAttribPointer(this.shader.attribs.uv, 2, this.gl.FLOAT, false, 0, 0);

	//  indices
	this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buf_id);

	//  finally... draw!
	this.gl.drawElements(this.gl.TRIANGLES, num * 6, this.gl.UNSIGNED_SHORT, 0);

	this.spritesChanged = false;	// reset this flag
};

module.exports = {
	SpriteBatch
};
