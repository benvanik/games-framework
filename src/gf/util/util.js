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

goog.provide('gf.util');


/**
 * Converts a string into an array buffer.
 * @param {string} data Source string.
 * @return {!ArrayBuffer} Binary buffer.
 */
gf.util.stringToArrayBuffer = function(data) {
  // Nasty, but we may end up being 2x larger than what we expect due to
  // utf8 variable-length char codes
  // Ensure we slice off at the bottom so no one else notices this
  var output = new Uint8Array(data.length * 2);
  var p = 0;
  for (var i = 0; i < data.length; i++) {
    var c = data.charCodeAt(i);
    while (c > 0xFF) {
      output[p++] = c;
      c >>= 8;
    }
    output[p++] = c;
  }
  return /** @type {!ArrayBuffer} */ (output.subarray(0, p).buffer);
};


/**
 * Converts an array buffer into a string.
 * @param {!ArrayBuffer} data Source array buffer.
 * @return {string} String.
 */
gf.util.arrayBufferToString = function(data) {
  // NOTE: it's possible to use the Uint8Array directly with fromCharCode in
  // some browsers, but not in others... unfortunately the ones that don't
  // support it are the ones that use this method
  var dataArray = new Uint8Array(data);
  var array = new Array(dataArray.length);
  for (var n = 0; n < array.length; n++) {
    array[n] = dataArray[n];
  }
  return String.fromCharCode.apply(null, array);
};
