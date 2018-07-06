'use strict';

importScripts('img_resize.js');

self.onmessage = function (event) {
  var data = event.data;

  var dstDataBuffer = new Uint8ClampedArray(data.dstWidth * data.dstHeight * 4);

  ImgResize.resizeImageData(
    new Uint8ClampedArray(data.srcDataBuffer),
    data.srcWidth, data.srcHeight,
    dstDataBuffer,
    data.dstWidth, data.dstHeight
  );
  self.postMessage(dstDataBuffer, [dstDataBuffer.buffer]);
};
