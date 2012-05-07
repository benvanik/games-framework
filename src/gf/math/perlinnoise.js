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

/**
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.math.PerlinNoise');



/**
 * Simple perlin noise generator.
 * @constructor
 * @param {!gf.math.RandomSource} random PRNG.
 * @param {number=} opt_gridSpacing Grid spacing. Higher values give coarser
 *     textures.
 */
gf.math.PerlinNoise = function(random, opt_gridSpacing) {
  /**
   * @type {number}
   */
  this.gridSpacing = opt_gridSpacing || 15;

  /**
   * @private
   * @type {!Float32Array}
   */
  this.gradients_ = new Float32Array(256 * 2);

  /**
   * @private
   * @type {!Uint8Array}
   */
  this.permutations_ = new Uint8Array(256);
  for (var n = 0; n < 256; n++) {
    var angle = 2 * Math.PI * random.next();
    this.gradients_[n] = Math.cos(angle);
    this.gradients_[256 + n] = Math.sin(angle);
    this.permutations_[n] = ~~(random.next() * 255);
  }
};


/**
 * Samples the given coordinates.
 * @param {number} x X.
 * @param {number} y Y.
 * @return {number} Noise value.
 */
gf.math.PerlinNoise.prototype.sample = function(x, y) {
  var xf = (x / this.gridSpacing);
  var yf = (y / this.gridSpacing);
  var xb = ~~xf;
  var yb = ~~yf;
  var forces = gf.math.PerlinNoise.tmpVec4_;
  for (var n = 0; n < 4; n++) {
    var xq = xb + n % 2;
    var yq = yb + ~~(n / 2);
    var i = (yq + this.permutations_[xq]) & 0xFF;
    forces[n] = this.gradients_[i] * (xf - xq) +
        this.gradients_[256 + i] * (yf - yq);
  }
  var sx = xf - ~~xf;
  var sy = yf - ~~yf;
  var xe = 3 * Math.pow(sx, 2) - 2 * Math.pow(sx, 3);
  var ye = 3 * Math.pow(sy, 2) - 2 * Math.pow(sy, 3);
  var a = forces[0] + xe * (forces[1] - forces[0]);
  var b = forces[2] + xe * (forces[3] - forces[2]);
  return a + ye * (b - a);
};


/**
 * Samples the given coordinates in a way that can be tiled.
 * @param {number} x X.
 * @param {number} y Y.
 * @param {number} tileSize Tile size.
 * @return {number} Noise value.
 */
gf.math.PerlinNoise.prototype.sampleTileable = function(x, y, tileSize) {
  return (
      this.sample(x + tileSize, y + tileSize) *
      (tileSize - x) * (tileSize - y) +
      this.sample(x, y + tileSize) * x * (tileSize - y) +
      this.sample(x, y) * x * y +
      this.sample(x + tileSize, y) * (tileSize - x) * y) /
      (tileSize * tileSize);
};


/**
 * @private
 * @type {!Float32Array}
 */
gf.math.PerlinNoise.tmpVec4_ = new Float32Array(4);
