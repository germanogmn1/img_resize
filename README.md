img_resize
==========

Resize images on browser with bi-cubic filter.

[Working Example](https://germanogmn1.github.io/img_resize/). Source code in [index.html](index.html).

API
---

High-level API:

```javascript
// image: image to be resized, must be a CanvasImageSource (HTMLImageElement, SVGImageElement, HTMLVideoElement, HTMLCanvasElement, ImageBitmap, OffscreenCanvas)
// sourceX, sourceY: top left corner of the sub-rectangle of the source image
// sourceWidth, sourceHeight: size of the sub-rectangle of the source image
// destWidth, destHeight: size of the resized image
// returns a HTMLCanvasElement containing the resized image
ImgResize.resizeImage(image, sourceX, sourceY, sourceWidth, sourceHeight, destWidth, destHeight)
```

Helper functions:

```javascript
// creates a HTMLImageElement from a canvas object
ImgResize.imageFromCanvas(canvas)

// create and load a HTMLImageElement from a File object
ImgResize.imageFromFile(file, callback)

// Calculate the sub-rectangle in the center of the source image with the same
// aspect ratio of the destination image.
// returns an object with keys x, y, width, height
ImgResize.centeredImageCrop(srcWidth, srcHeight, dstWidth, dstHeight)
```

Low level API:

```javascript
// Resizes srcImg into dstImg, with the dimensions of dstImg
// srcImg and dstImg must be of ImageData type
ImgResize.resizeImageData(srcImg, dstImg)
```

Usage Example
-------------

```javascript
var file = document.querySelector('input[type=file]').files[0];
ImgResize.imageFromFile(file, function (img) {
  var canvas = ImgResize.resizeImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 800, 600);
  var result = ImgResize.imageFromCanvas(canvas);
  document.body.appendChild(result);
});
```
