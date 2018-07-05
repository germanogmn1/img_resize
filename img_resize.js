(function () {
  'use strict';

  function filterBicubic(x) {
    if (x < 0) x = -x;

    var a = -0.5;
    if (x <= 1) {
      return (a+2)*(x*x*x) - (a+3)*(x*x) + 1;
    } else if (x < 2) {
      return a*(x*x*x) - 5*a*(x*x) + 8*a*x - 4*a;
    } else {
      return 0;
    }
  }

  var BICUBIC_SUPPORT = 2;

  // For each destination pixel, make a list of source image pixels that contribute to it
  // contributor list format: [[{ index: int, weigth: float }, ...], ...]
  function makeContributorList(dstSize, srcSize, filterSupport) {
    var contributors = [];

    var scale = dstSize / srcSize;
    var scaleFactor = (scale < 1 ? scale : 1);

    for (var dst = 0; dst < dstSize; dst++) {
      var srcCenter = ((dst + 0.5) / scale) - 0.5;
      var srcPixels = [];

      var firstPixel = Math.floor(srcCenter - filterSupport);
      var lastPixel = Math.ceil(srcCenter + filterSupport);
      if (scale < 1) {
        firstPixel = Math.floor(srcCenter - filterSupport/scale);
        lastPixel = Math.ceil(srcCenter + filterSupport/scale);
      }

      var totalWeigth = 0;
      for (var sample = firstPixel; sample <= lastPixel; sample++) {
        var dist = (srcCenter - sample) * scaleFactor;
        totalWeigth += filterBicubic(dist);
      }
      var norm = 1/totalWeigth;

      for (var sample = firstPixel; sample <= lastPixel; sample++) {
        var dist = (srcCenter - sample) * scaleFactor;
        if (dist > filterSupport)
          continue;
        var weigth = filterBicubic(dist) * norm;
        if (weigth == 0)
          continue;

        var index = Math.min(Math.max(sample, 0), srcSize - 1); // clamp to border
        srcPixels.push({ index: index, weigth: weigth });
      }

      contributors.push(srcPixels);
    }

    return contributors;
  }

  // srcImg and dstImg must be of ImageData type
  function resizeImageData(srcImg, dstImg) {
    var srcData = srcImg.data;
    var dstData = dstImg.data;

    var srcWidth = srcImg.width;
    var srcHeight = srcImg.height;

    var dstWidth = dstImg.width;
    var dstHeight = dstImg.height;

    var contributorsX = makeContributorList(dstWidth, srcWidth, BICUBIC_SUPPORT);
    var contributorsY = makeContributorList(dstHeight, srcHeight, BICUBIC_SUPPORT);

    // Temp buffer for Y convolution, RGB only, we don't need alpha
    var rowBuffer = Array(srcWidth * 3);

    for (var dstY = 0; dstY < dstHeight; dstY++) {
      // Y convolution
      for (var srcX = 0; srcX < srcWidth; srcX++) {
        var srcPixels = contributorsY[dstY];
        var r = 0, g = 0, b = 0;

        for (var ip = 0; ip < srcPixels.length; ip++) {
          var pixel = srcPixels[ip];
          var srcP = (pixel.index*srcWidth + srcX) * 4;
          r += pixel.weigth * srcData[srcP];
          g += pixel.weigth * srcData[srcP + 1];
          b += pixel.weigth * srcData[srcP + 2];
        }

        rowBuffer[srcX * 3]     = r;
        rowBuffer[srcX * 3 + 1] = g;
        rowBuffer[srcX * 3 + 2] = b;
      }

      // X convolution
      for (var dstX = 0; dstX < dstWidth; dstX++) {
        var srcPixels = contributorsX[dstX];

        var r = 0, g = 0, b = 0;
        for (var ip = 0; ip < srcPixels.length; ip++) {
          var pixel = srcPixels[ip];
          var srcP = pixel.index * 3;
          r += pixel.weigth * rowBuffer[srcP];
          g += pixel.weigth * rowBuffer[srcP + 1];
          b += pixel.weigth * rowBuffer[srcP + 2];
        }

        var dstP = (dstY*dstWidth + dstX) * 4;
        dstData[dstP] = r;
        dstData[dstP+1] = g;
        dstData[dstP+2] = b;
        dstData[dstP+3] = 255;
      }
    }
  }

  function imageFromCanvas(canvas) {
    var img = document.createElement('img');
    img.src = canvas.toDataURL('image/jpeg');
    return img;
  }

  function imageFromFile(file, callback) {
    var img = new Image();
    img.onload = function () { callback(img); }
    img.src = URL.createObjectURL(file);
  }

  // Calculate the sub-rectangle in the center of the source image with the same
  // aspect ratio of the destination image.
  // returns an object with keys x, y, width, height
  function centeredImageCrop(srcWidth, srcHeight, dstWidth, dstHeight) {
    var srcAspect = srcWidth / srcHeight;
    var dstAspect = dstWidth / dstHeight;

    var cropWidth, cropHeight;
    var offsetX = 0, offsetY = 0;

    if (srcAspect > dstAspect) {
      cropWidth = srcHeight * dstAspect;
      cropHeight = srcHeight;
      offsetX = (srcWidth - cropWidth) / 2;
    } else {
      cropWidth = srcWidth;
      cropHeight = srcWidth / dstAspect;
      offsetY = (srcHeight - cropHeight) / 2;
    }

    return {
      x: Math.floor(offsetX),
      y: Math.floor(offsetY),
      width: Math.floor(cropWidth),
      height: Math.floor(cropHeight)
    };
  }

  // image: image to be resized, must be a CanvasImageSource (HTMLImageElement, SVGImageElement, HTMLVideoElement, HTMLCanvasElement, ImageBitmap, OffscreenCanvas)
  // sourceX, sourceY: top left corner of the sub-rectangle of the source image
  // sourceWidth, sourceHeight: size of the sub-rectangle of the source image
  // destWidth, destHeight: size of the resized image
  // returns a HTMLCanvasElement containing the resized image
  function resizeImage(image, sourceX, sourceY, sourceWidth, sourceHeight, destWidth, destHeight) {
    // create source image canvas
    var canvas = document.createElement('canvas');
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    var ctx = canvas.getContext('2d');

    // draw image cropped in canvas
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);

    // get ImageData and perform the resize
    var sourceImg = ctx.getImageData(0, 0, sourceWidth, sourceHeight);
    var destImg = ctx.createImageData(destWidth, destHeight);
    resizeImageData(sourceImg, destImg);

    // resize the canvas and put the resized image on it
    ctx.canvas.width = destWidth;
    ctx.canvas.height = destHeight;
    ctx.putImageData(destImg, 0, 0);

    return canvas;
  }

  window.ImgResize = {
    resizeImage: resizeImage,
    resizeImageData: resizeImageData,
    imageFromCanvas: imageFromCanvas,
    imageFromFile: imageFromFile,
    centeredImageCrop: centeredImageCrop,
  };
})();
