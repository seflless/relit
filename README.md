## Relit
Relight Photos & Images Using Normal Maps.

<img width="25%" src="http://francoislaberge.com/images/statue-diffuse-thumbnail.png"/> **+**
<img width="25%" src="http://francoislaberge.com/relit/examples/normal-mapping/texture/statue-normals.png"/> **=**
<img width="25%" src="http://francoislaberge.com/images/statue-final.gif"/>

**Demos**
 - [Normal Mapping](http://francoislaberge.com/relit/examples/normal-mapping/?texture=statue)
 - [Spherical Reference Textures](http://francoislaberge.com/relit/examples/reference-sphere/)

### Usage

#### 1) Installation
```bash
npm install --save relit
```
or
```bash
yarn add relit
```
or
```html
<script src="http://francoislaberge.com/relit/lib/index.js" type="text/javascript"></script>
```
#### 2) Include Module
Get a reference to the module first via either of these methods:
```js
const relit = require('relit');
```
or
```html
<script src="http://francoislaberge.com/relit/lib/index.js" type="text/javascript"></script>
<script>
    // relit is now attached to the window object, making it a global.
</script>
```
    **Note (for above method)**: It's better to download the file and serve it from your own server
#### 3) Create Instance
Create an instance inside a specified container DOM element.
```js
relit.create({
    container: document.body,
    diffuseTexture: "diffuse.png",
    normalsTexture: "normals.png",

    // The following are all optional
    width: 128,                         // Width / Height of canvas element
    height: 128,                        // Default is to use the diffuse textures dimensions

    lightDirection: [ 1.0, 0.0, 0.0 ],  // The initial light direction.
                                        // Default is [ 0, 0, 1 ]                       

    lightColor: [ 191, 191, 191],       // The initial directional light color.
                                        // Default is [ 255, 255, 255 ]

    ambientColor: [0, 0, 64],           // The color of the ambient light.
                                        // Default is black [ 0, 0, 0 ]
})
.then( (relight) => {

})
```
     **Note** The inserted canvas is not a `display: block` so that it can be embedded in text. Change this via css styling if needed.

**TODO: Finish this.**

### Coordinate Systems

<img src="http://francoislaberge.com/relit/images/webgl-axes.png" width="40%"/>

### Contributing

#### Setup
```
git clone git@github.com:francoislaberge/relit.git
cd relit
npm install
npm start
```

#### Development Workflow Commands

 - `npm run clean`
 - `npm run build`
 - `npm run watch`

#### Publishing to NPM

```
npm version patch|minor|major
npm publish
git push && git push --tags
```
