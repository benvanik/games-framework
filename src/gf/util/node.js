/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

goog.provide('gf.util.node');


/**
 * Converts a node Buffer to an ArrayBuffer.
 * @param {!Buffer} buffer Node buffer.
 * @return {!ArrayBuffer} ArrayBuffer.
 */
gf.util.node.bufferToArrayBuffer = function(buffer) {
  var arrayBuffer = new Uint8Array(buffer.length);
  for (var n = 0; n < buffer.length; n++) {
    arrayBuffer[n] = buffer[n];
  }
  return /** @type {!ArrayBuffer} */ (arrayBuffer.buffer);
};


/**
 * Converts an ArrayBuffer into a node Buffer type.
 * @param {!ArrayBuffer} data Source ArrayBuffer.
 * @return {!Buffer} Node Buffer.
 */
gf.util.node.arrayBufferToBuffer = function(data) {
  var nodeBuffer = new Buffer(data.byteLength);
  var arrayBuffer = new Uint8Array(data);
  for (var n = 0; n < arrayBuffer.length; n++) {
    nodeBuffer[n] = arrayBuffer[n];
  }
  return nodeBuffer;
};


/**
 * Combines a list of ArrayBuffers into a node Buffer type.
 * @param {!Array.<ArrayBuffer>} dataList Source ArrayBuffers.
 * @return {!Buffer} Node Buffer.
 */
gf.util.node.arrayBuffersToBuffer = function(dataList) {
  var totalSize = 0;
  for (var n = 0; n < dataList.length; n++) {
    var data = dataList[n];
    if (data) {
      totalSize += data.byteLength;
    }
  }

  var nodeBuffer = new Buffer(totalSize);
  for (var n = 0, offset = 0; n < dataList.length; n++) {
    var arrayBuffer = new Uint8Array(dataList[n]);
    for (var m = 0; m < arrayBuffer.length; m++) {
      nodeBuffer[offset++] = arrayBuffer[m];
    }
  }
  return nodeBuffer;
};
