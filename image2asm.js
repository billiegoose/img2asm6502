// Set up drag & drop.
displayCanvas.ondragover = function () { this.className = 'hover'; return false; };
displayCanvas.ondragend = function () { this.className = ''; return false; };
displayCanvas.ondrop = function (e) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      readfile(e.dataTransfer.files[0]);
    } else {
      sourceImage.src = e.dataTransfer.getData('text/uri-list');
      setTimeout(processImage, 500);
    }
}

function readfile (file) {
    var reader = new FileReader();
    // TODO: tidy up. use Image.onload instead of timeout assumption.
    reader.onload = function (event) {
      sourceImage.src = event.target.result;
      setTimeout(processImage, 500);
    };
    reader.readAsDataURL(file);
}

// Assembler color palette. Source: https://github.com/skilldrick/6502js
/*
$0: Black
$1: White
$2: Red
$3: Cyan
$4: Purple
$5: Green
$6: Blue
$7: Yellow
$8: Orange
$9: Brown
$a: Light red
$b: Dark grey
$c: Grey
$d: Light green
$e: Light blue
$f: Light grey
*/
var palette = [
      [0x00,0x00,0x00], [0xff,0xff,0xff], [0x88,0x00,0x00], [0xaa,0xff,0xee],
      [0xcc,0x44,0xcc], [0x00,0xcc,0x55], [0x00,0x00,0xaa], [0xee,0xee,0x77],
      [0xdd,0x88,0x55], [0x66,0x44,0x00], [0xff,0x77,0x77], [0x33,0x33,0x33],
      [0x77,0x77,0x77], [0xaa,0xff,0x66], [0x00,0x88,0xff], [0xbb,0xbb,0xbb]
    ];
function closest_color(a) {
    var smallest = 0xFFFFFF;
    var index = -1;
    for (var i = 0; i < palette.length; i++) {
        var diff = measure_similarity(a,palette[i]);
        if (diff < smallest) {
            smallest = diff;
            index = i;
        }
    }
    return index;
}
// Sanity check. Should say "0,1,2,3,4,5" if closest_color is even close to halfway decent.
// alert(closest_color( [0x00,0x00,0x00]) +','+ closest_color([0xff,0xff,0xff]) +','+ 
//       closest_color([0x88,0x00,0x00]) +','+ closest_color([0xaa,0xff,0xee]) +','+ 
//       closest_color([0xcd,0x45,0xcd]) +','+ closest_color([0x00,0xcb,0x54]));

function processImage() {
    var imageWidth = 32;
    var imageHeight = 32;
    var scale = 4;
    // Render image to work canvas
    var workContext = workCanvas.getContext('2d');
    workContext.clearRect(0, 0, workCanvas.width, workCanvas.height);
    workContext.drawImage(sourceImage, 0, 0);  
    // Paste work canvas on display canvas while enlarging.
    var displayContext = displayCanvas.getContext('2d');
    displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayContext.webkitImageSmoothingEnabled = false;
    displayContext.drawImage(workCanvas,0,0,imageWidth,imageHeight, 0,0,imageWidth*scale,imageHeight*scale);

    // Get pixel data in work canvas
    var sourceData = workContext.getImageData(0, 0, imageWidth, imageHeight);
    var data = sourceData.data;
    // iterate over all pixels
    var output = "";
    for(var i = 0, n = data.length; i < n; i += 4) {
        var red   = data[i];
        var green = data[i + 1];
        var blue  = data[i + 2];
        var alpha = data[i + 3];
        
        // Useful but not used. Converts to single number.
        //var num = rgb2hex(red,green,blue);
        //output += red +','+green+','+blue +' '+num.toString(16) + ' '; //pad(num.toString(16),6) + '\n';
        
        // Decide which color in our palette best represents this pixel.
        var val = closest_color([red,green,blue]);

        // Put new value from the color pallete into the current data.
        data[i] = palette[val][0];
        data[i+1] = palette[val][1];
        data[i+2] = palette[val][2];
        data[i+3] = 255;

        // Append necessary assembly code to output
        output += 'LDA #$' + pad(val.toString(16),2) + '\n';
        output += 'STA $' + pad((512+i/4).toString(16),4) + '\n';
    }
    // Write the image buffer with our palettized image back to work canvas.
    workContext.putImageData(sourceData,0,0);
    // Copy work canvas to display canvas (to right of original image) and enlarge.
    displayContext.drawImage(workCanvas,0,0,imageWidth,imageHeight, imageWidth*scale,0,imageWidth*scale,imageHeight*scale);

    // Generate color palette
    for (var i = 0; i < palette.length; i++) {
        data[i*4+0] = palette[i][0];
        data[i*4+1] = palette[i][1];
        data[i*4+2] = palette[i][2];
        data[i*4+3] = 255;
    };
    workContext.putImageData(sourceData,0,0);
    // Display color palette
    displayContext.drawImage(workCanvas,0,0,16,1, 0,128,16*16,16);
    // Populate the output with the assembly code
    var hex = document.getElementById('hex');
    hex.innerHTML = output;
}
setTimeout(processImage, 500);

// Compute the similarity between two colors. Return value of 0 means same color, large values mean very different.
function measure_similarity(a, b) {
    // Herein lies the problem. How do you measure the distance between two colors?
    // Several attempts lie within. Curiously the most naive approach seems to do the best.
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
    
    // return 0.2989 *Math.abs(a[0]-b[0]) + 0.5870 * Math.abs(a[1]-b[1]) + 0.1140 * Math.abs(a[2]-b[2]);

    // return Math.sqrt((a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) + (a[2]-b[2])*(a[2]-b[2]));

//     a = rgbToXyz(a);
//     b = rgbToXyz(b);
//     a = xyzToLab(a);
//     b = xyzToLab(b);
//     return cie1994(a,b,false);
}

// Misc functions
function pad(a,b){return(1e15+a+"").slice(-b)} //https://gist.github.com/aemkei/1180489
function rgb2hex(r,g,b) {
    return parseInt(r.toString(16) + g.toString(16) + b.toString(16), 16);
}
function hex2rgb(hex) {
    hex = pad(hex.toString(16),6);
    var r = hex[0] + hex[1];
    var g = hex[2] + hex[3];
    var b = hex[4] + hex[5];
    return [r,g,b];
}
function rgb2hsv (args) {
    var rr, gg, bb,
        r = args[0] / 255,
        g = args[1] / 255,
        b = args[2] / 255,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c){
            return (v - c) / 6 / diff + 1 / 2;
        };

    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);

        if (r === v) {
            h = bb - gg;
        }else if (g === v) {
            h = (1 / 3) + rr - bb;
        }else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100)
    };
}

//http://html5hub.com/exploring-color-matching-in-javascript/#i.15iwr0d1dhpd11

// Convert RGB to XYZ
function rgbToXyz(args) {
    var _r = (args[0] / 255);
    var _g = (args[1] / 255);
    var _b = (args[2] / 255);
 
    if (_r > 0.04045) {
        _r = Math.pow(((_r + 0.055) / 1.055), 2.4);
    }
    else {
        _r = _r / 12.92;
    }
 
    if (_g > 0.04045) {
        _g = Math.pow(((_g + 0.055) / 1.055), 2.4);
    }
    else {
        _g = _g / 12.92;
    }
 
    if (_b > 0.04045) {
        _b = Math.pow(((_b + 0.055) / 1.055), 2.4);
    }
    else {
        _b = _b / 12.92;
    }
 
    _r = _r * 100;
    _g = _g * 100;
    _b = _b * 100;
 
    X = _r * 0.4124 + _g * 0.3576 + _b * 0.1805;
    Y = _r * 0.2126 + _g * 0.7152 + _b * 0.0722;
    Z = _r * 0.0193 + _g * 0.1192 + _b * 0.9505;
 
    return [X, Y, Z];
};

// Convert XYZ to LAB
function xyzToLab(args) {
    var ref_X =  95.047;
    var ref_Y = 100.000;
    var ref_Z = 108.883;
 
    var _X = args[0] / ref_X;
    var _Y = args[1] / ref_Y;
    var _Z = args[2] / ref_Z;
 
    if (_X > 0.008856) {
         _X = Math.pow(_X, (1/3));
    }
    else {
        _X = (7.787 * _X) + (16 / 116);
    }
 
    if (_Y > 0.008856) {
        _Y = Math.pow(_Y, (1/3));
    }
    else {
      _Y = (7.787 * _Y) + (16 / 116);
    }
 
    if (_Z > 0.008856) {
        _Z = Math.pow(_Z, (1/3));
    }
    else {
        _Z = (7.787 * _Z) + (16 / 116);
    }
 
    var CIE_L = (116 * _Y) - 16;
    var CIE_a = 500 * (_X - _Y);
    var CIE_b = 200 * (_Y - _Z);
 
    return [CIE_L, CIE_a, CIE_b];
};

// Finally, use cie1994 to get delta-e using LAB
function cie1994(x, y, isTextiles) {
    var x = {l: x[0], a: x[1], b: x[2]};
    var y = {l: y[0], a: y[1], b: y[2]};
    labx = x;
    laby = y;
    var k2;
    var k1;
    var kl;
    var kh = 1;
    var kc = 1;
    if (isTextiles) {
        k2 = 0.014;
        k1 = 0.048;
        kl = 2;
    }
    else {
        k2 = 0.015;
        k1 = 0.045;
        kl = 1;
    }
 
    var c1 = Math.sqrt(x.a * x.a + x.b * x.b);
    var c2 = Math.sqrt(y.a * y.a + y.b * y.b);
 
    var sh = 1 + k2 * c1;
    var sc = 1 + k1 * c1;
    var sl = 1;
 
    var da = x.a - y.a;
    var db = x.b - y.b;
    var dc = c1 - c2;
 
    var dl = x.l - y.l;
    var dh = Math.sqrt(da * da + db * db - dc * dc);
 
    return Math.sqrt(Math.pow((dl/(kl * sl)),2) + Math.pow((dc/(kc * sc)),2) + Math.pow((dh/(kh * sh)),2));
};