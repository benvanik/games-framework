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


/**
 * Linear interpolation between two color values.
 * @param {number} source Source Uint32 color as ABGR.
 * @param {number} target Target Uint32 color as ABGR.
 * @param {number} t Interpolation value, [0-1].
 * @return {number} Result ABGR.
 */
gf.vec.Color.lerpUint32 = function(source, target, t) {
  // There has got to be a better way...
  // Knowing that t = [0,1], I'm sure it's possible to do this in two mults
  var sourceA = (source >> 24) & 0xFF;
  var sourceB = (source >> 16) & 0xFF;
  var sourceG = (source >> 8) & 0xFF;
  var sourceR = source & 0xFF;
  var targetA = (target >> 24) & 0xFF;
  var targetB = (target >> 16) & 0xFF;
  var targetG = (target >> 8) & 0xFF;
  var targetR = target & 0xFF;
  var result =
      ((sourceA + t * (targetA - sourceA)) & 0xFF) << 24 |
      ((sourceB + t * (targetB - sourceB)) & 0xFF) << 16 |
      ((sourceG + t * (targetG - sourceG)) & 0xFF) << 8 |
      ((sourceR + t * (targetR - sourceR)) & 0xFF);
  return result;
};
