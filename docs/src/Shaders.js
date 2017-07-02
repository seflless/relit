const vertexShaderSource = `
//  Textured, lit, normal mapped vert shader
precision mediump float;

attribute vec2 aPosition;		// 2D position
attribute vec2 aTexCoord;		// Texture & normal map coords
attribute float aRotation;		// Indicates rotation of sprite - must set for each vertex

uniform float uSceneWidth;		// Width, height of scene - used to transform
uniform float uSceneHeight;		//   world coords to normalized device coords.
uniform float uAspect;			// Aspect ratio of canvas
uniform vec3 uLightDir;			// Application can set desired light direction

varying vec2 vTexCoord;			// Passed through to frag shader
varying vec3 vLightDir;			// Compute transformed light dir for frag shader

void main(void)
{
    vTexCoord = aTexCoord;	// frag shader needs texcoord

    // Figure out light direction relative to this rotated vertex.
    // Simply rotate the light dir by negative vertex rotation.
    float cosR = cos(-aRotation);
    float sinR = sin(-aRotation);
    vLightDir.x = (uLightDir.x * cosR - uLightDir.y * sinR) * uAspect;  // correct for aspect ratio
    vLightDir.y = uLightDir.x * sinR + uLightDir.y * cosR;
    vLightDir.z = uLightDir.z;
    // Finally normalize it so the frag shader can use it without any further adjustments
    vLightDir = normalize(vLightDir);

    // Since we're working in 2D, we can do a simple 2D scale to normalized device coords (from -1..1)
    // (no need for a full blown proj/modelview matrix multiply)
    gl_Position.x = aPosition.x / uSceneWidth;
    gl_Position.y = aPosition.y / uSceneHeight;
    gl_Position.z = 0.5;  // z should be from 0..1
    gl_Position.w = 1.0;  // no perspective
}
`;

const fragmentShaderSource = `
//  Textured, lit, normal mapped frag shader
precision mediump float;

// uniforms from app
uniform sampler2D uSamplerD;	// diffuse texture map
uniform sampler2D uSamplerN;	// normal texture map
uniform vec3 uLightColor;		// directional light color
uniform vec3 uAmbientColor;		// ambient light color

// interpolated values from vertex shader
varying vec2 vTexCoord;
varying vec3 vLightDir;

void main()
{
    // get the color values from the texture and normalmap
    vec4 clrDiffuse = texture2D(uSamplerD, vTexCoord);
    vec3 clrNormal = texture2D(uSamplerN, vTexCoord).rgb;

    // scale & normalize the normalmap color to get a normal vector for this texel
    vec3 normal = normalize(clrNormal * 2.0 - 1.0);

    // Calc normal dot lightdir to get directional lighting value for this texel.
    // Clamp negative values to 0.
    vec3 litDirColor = uLightColor * max(dot(normal, vLightDir), 0.0);

    // add ambient light, then multiply result by diffuse tex color for final color
    vec3 finalColor = (uAmbientColor + litDirColor) * clrDiffuse.rgb;

    // finally apply alpha of texture for the final color to render
    gl_FragColor = vec4(finalColor, clrDiffuse.a);
}
`;