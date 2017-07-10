(function () {
    var canvas = document.getElementById("canvas"),
        context = canvas.getContext("2d"),
        img = document.createElement("img");

    canvas.width = 512;
    canvas.height = 512;
    context.fillStyle = "white";
    context.fillRect( 0, 0, canvas.width, canvas.height );
    document.body.style.width = canvas.width + 'px';

    // Image for loading	
    img.addEventListener("load", function () {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        
        document.body.style.width = canvas.width + 'px';

        // 
        const imageData = context.getImageData(0, 0, img.width, img.height);
        let data = imageData.data;

        for(let y = 0; y<img.height; y++){
            for(let x = 0; x<img.width; x++){
                const pixelOffset = (y * img.width + x) * 4;

                /*
                    * For now just flip the y component, this will be used for converting normal maps
                    * from my old demo to use the standard normal map coordinates.
                    * TODO: Make this flexible so you could specify what transformations are desired
                    */
                //data[pixelOffset]       = 255 - data[pixelOffset];

                let normal = toNormal( [ data[pixelOffset + 0], data[pixelOffset + 1], data[pixelOffset + 2] ])
                normal[1] = -normal[1];
                let color = toColor(normal);

                data[pixelOffset + 0]   = color[0];
                data[pixelOffset + 1]   = color[1];
                data[pixelOffset + 2]   = color[2];
                //data[pixelOffset + 2]   = 255 - data[pixelOffset + 2];
            }
        }



        context.putImageData( imageData, 0, 0 );

    }, false);
    
    // To enable drag and drop
    canvas.addEventListener("dragover", function (evt) {
        evt.preventDefault();
    }, false);

    // Handle dropped image file - only Firefox and Google Chrome
    canvas.addEventListener("drop", function (evt) {
        var files = evt.dataTransfer.files;
        if (files.length > 0) {
            var file = files[0];
            if (typeof FileReader !== "undefined" && file.type.indexOf("image") != -1) {
                var reader = new FileReader();
                // Note: addEventListener doesn't work in Google Chrome for this event
                reader.onload = function (evt) {
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        }
        evt.preventDefault();
    }, false);


    const downloadLink = document.getElementById('download');
    downloadLink.addEventListener('click', (event) => {
        // target is it's child element the canvas it wraps
        downloadLink.href = event.target.toDataURL('image/png');
    })
})();

