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

goog.provide('gf.vec.Color');


/**
 * @fileoverview A simple color manipulation type, assuming storage in a 3 or 4
 * element Float32Array.
 */


/**
 * Converts a floating point color to a packed 32-bit number in ABGR format.
 * @param {!goog.vec.Vec4.Float32} value Source color in [0-1] RGBA.
 * @return {number} The color in ABGR format.
 */
gf.vec.Color.toUint32 = function(value) {
  var r = Math.min(255, value[0] * 255);
  var g = Math.min(255, value[1] * 255);
  var b = Math.min(255, value[2] * 255);
  var a = Math.min(255, value[3] * 255);
  return (a << 24) | (b << 16) | (g << 8) | r;
};
