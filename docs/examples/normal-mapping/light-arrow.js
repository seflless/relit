let lightDirectionCanvas = document.getElementById('light-direction');
let lightDirectionCtx = lightDirectionCanvas.getContext('2d');

function drawLightArrow(lightDir){
    // Draw light direction arrow. Based off of this approach
    // https://stackoverflow.com/a/6333775
    const length = lightDirectionCanvas.width/2;
    const toX = lightDirectionCanvas.width/2;
    const toY = lightDirectionCanvas.height/2;
    const fromX = toX + lightDir[0] * length;
    const fromY = toY - lightDir[1] * length;
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const arrowHeadLength = Math.min(10, lineLength);
    const angle = Math.atan2(toY-fromY,toX-fromX);

    lightDirectionCtx.clearRect( 0, 0, lightDirectionCanvas.width, lightDirectionCanvas.height );

    lightDirectionCtx.strokeStyle = "rgba( 255, 255, 255, 0.8 )";
    lightDirectionCtx.lineWidth = 2;
    lightDirectionCtx.beginPath();
    lightDirectionCtx.moveTo(fromX, fromY);
    lightDirectionCtx.lineTo(toX, toY);
    lightDirectionCtx.lineTo(toX-arrowHeadLength*Math.cos(angle-Math.PI/6),toY-arrowHeadLength*Math.sin(angle-Math.PI/6));
    lightDirectionCtx.moveTo(toX, toY);
    lightDirectionCtx.lineTo(toX-arrowHeadLength*Math.cos(angle+Math.PI/6),toY-arrowHeadLength*Math.sin(angle+Math.PI/6));
    lightDirectionCtx.stroke();
}
