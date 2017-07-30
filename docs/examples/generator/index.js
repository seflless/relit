(function () {
    const container = document.getElementById('container');
    const imageNames = [
        'diffuse',
        'left',
        'right',
        'front',
        'back',
        'top',
        'bottom'
    ];
    let image = {};
    let canvas = {};
    let ctx = {};
    let loaded = 0;
    let normalsCanvas = document.getElementById('normals');
    let normalsCtx = normalsCanvas.getContext('2d');

    imageNames.forEach( imageName => {
        const span = document.createElement('span');
        span.innerHTML = `<h1>${imageName}</h1><canvas id="${imageName}"></canvas>`;

        image[imageName] = document.createElement('img');
        image[imageName].src = `images/${imageName}.jpg`;

        image[imageName].onload = () => {
            canvas[imageName].width = image[imageName].width;
            canvas[imageName].height = image[imageName].height;
            ctx[imageName].drawImage(image[imageName], 0, 0);

            if(imageName !== 'diffuse'){
                greyScaleAndEnhance(imageName);
            }

            loaded++;
            if(loaded >= imageNames.length){
                console.log('all loaded');
                generate();
            }
        };

        canvas[imageName] = span.childNodes[1];
        canvas[imageName].addEventListener("dragover", function (evt) {
            evt.preventDefault();
        }, false);
        ctx[imageName] = canvas[imageName].getContext('2d');

        // Handle dropped image file - only Firefox and Google Chrome
        canvas[imageName].addEventListener("drop", (evt) => {
            var files = evt.dataTransfer.files;
            if (files.length > 0) {
                var file = files[0];
                if (typeof FileReader !== "undefined" && file.type.indexOf("image") != -1) {
                    var reader = new FileReader();
                    // Note: addEventListener doesn't work in Google Chrome for this event
                    reader.onload = function (evt) {
                        image[imageName].src = evt.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            }
            evt.preventDefault();
        }, false);

        container.appendChild(span);
    });

    function greyScaleAndEnhance(imageName){
        // 
        const context = ctx[imageName];
        const img = image[imageName];
        const imageData = context.getImageData(0, 0, img.width, img.height);
        let data = imageData.data;

        let min = 255;
        let max = 0;

        // Convert to grey scale and remember the highest and lowest channel value;
        for(let y = 0; y<img.height; y++){
            for(let x = 0; x<img.width; x++){
                const pixelOffset = (y * img.width + x) * 4;

                let maxChannel = Math.max( Math.max( data[pixelOffset + 0], data[pixelOffset + 1]), data[pixelOffset + 2] );

                data[pixelOffset + 0]   = maxChannel;
                data[pixelOffset + 1]   = maxChannel;
                data[pixelOffset + 2]   = maxChannel;

                if(maxChannel>max){
                    max = maxChannel;
                }
                if(maxChannel<min){
                    min = maxChannel;
                }
                //data[pixelOffset + 2]   = 255 - data[pixelOffset + 2];
            }
        }

        // Scale the color range of the image so that the brightest value is considered white, and the darkest is black.
        // This is done because you can assume even a pixel surface perfectly facing the light source will not be captured
        // as brightness 255 by cameras. This makes it so the brightest value is considered to be perfectly facing the light,
        // the assumption could be wrong but it's going to be right more than not.
        for(let y = 0; y<img.height; y++){
            for(let x = 0; x<img.width; x++){
                const pixelOffset = (y * img.width + x) * 4;

                // It's gray scale, so just grab the first channel's value
                let channel = data[pixelOffset + 0];
                let scaledChannel = Math.floor( ( channel - min ) / ( max - min ) * 255.0 ); 

                data[pixelOffset + 0]   = scaledChannel;
                data[pixelOffset + 1]   = scaledChannel;
                data[pixelOffset + 2]   = scaledChannel;
            }
        }

        console.log(imageName, min, max);
        context.putImageData( imageData, 0, 0 );
    }

    function generate(){
        let data = {};
        imageNames.forEach( imageName => {
            if( imageName === 'diffuse' ){
                return;
            }
            const imageData = ctx[imageName].getImageData(0, 0, image[imageName].width, image[imageName].height);
            data[imageName] = imageData.data;
        });
        
        normalsCanvas.width = image['diffuse'].width;
        normalsCanvas.height = image['diffuse'].height;
        let normalsData = normalsCtx.getImageData(0, 0, normalsCanvas.width, normalsCanvas.height);
        let normalsDataData = normalsData.data;

        for(let y = 0; y<normalsCanvas.height; y++){
            for(let x = 0; x<normalsCanvas.width; x++){
                const pixelOffset = (y * normalsCanvas.width + x) * 4;

                const normal = [
                    channelDir( data['left'][pixelOffset], data['right'][pixelOffset] ),
                    channelDir( data['back'][pixelOffset], data['front'][pixelOffset] ),
                    channelDir( data['bottom'][pixelOffset], data['top'][pixelOffset] )
                ];
                const color = toColor(normal);

                normalsDataData[pixelOffset + 0]   = color[0];
                normalsDataData[pixelOffset + 1]   = color[1];
                normalsDataData[pixelOffset + 2]   = color[2];
                normalsDataData[pixelOffset + 3]   = 255;
            }
        }

        normalsCtx.putImageData( normalsData, 0, 0 );
    }

    function channelDir(neg, pos){
        if( neg > pos ){
            return neg / 255.0 * -1.0;
        } else {
            return pos / 255.0;
        }
    }

    const downloadLink = document.getElementById('download');
    downloadLink.addEventListener('click', (event) => {
        // target is it's child element the canvas it wraps
        downloadLink.href = event.target.toDataURL('image/png');
    })
})();

