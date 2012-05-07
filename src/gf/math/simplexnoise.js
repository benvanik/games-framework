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
 * This file originates largely from this gist:
 * https://gist.github.com/304522 by banksean@gmail.com (Sean McCullough)
 * Ported from Stefan Gustavson's java implementation
 * http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
 * Read Stefan's excellent paper for details on how this code works.
 *
 * Many modifications have been made for performance.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.math.SimplexNoise');



/**
 * Perlin simplex noise generator.
 * @constructor
 * @param {!gf.math.RandomSource} random PRNG.
 */
gf.math.SimplexNoise = function(random) {
  /**
   * @private
   * @type {!Float32Array}
   */
  this.gradients_ = new Float32Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
  ]);

  /**
   * @private
   * @type {!Uint8Array}
   */
  this.permutations_ = new Uint8Array(256);
  for (var n = 0; n < 256; n++) {
    this.permutations_[n] = this.permutations_[256 + n] =
        ~~(random.next() * 255);
  }
};


/**
 * Computes the dot-product of the given 2D coordinate and the gradient map.
 * @private
 * @param {number} gi Index into the gradients list.
 * @param {number} x X.
 * @param {number} y Y.
 * @return {number} 2D dotted value.
 */
gf.math.SimplexNoise.prototype.dot2d_ = function(gi, x, y) {
  var g = this.gradients_;
  return g[gi * 3] * x + g[gi * 3 + 1] * y;
};


/**
 * Computes the dot-product of the given 3D coordinate and the gradient map.
 * @private
 * @param {number} gi Index into the gradients list.
 * @param {number} x X.
 * @param {number} y Y.
 * @param {number} z Z.
 * @return {number} 3D dotted value.
 */
gf.math.SimplexNoise.prototype.dot3d_ = function(gi, x, y, z) {
  var g = this.gradients_;
  return g[gi * 3] * x + g[gi * 3 + 1] * y + g[gi * 3 + 2] * z;
};


/**
 * Samples the given 2D coordinates.
 * @param {number} xin X.
 * @param {number} yin Y.
 * @return {number} Noise value.
 */
gf.math.SimplexNoise.prototype.sample = function(xin, yin) {
  var n0, n1, n2; // Noise contributions from the three corners
  // Skew the input space to determine which simplex cell we're in
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var s = (xin + yin) * F2; // Hairy factor for 2D
  var i = Math.floor(xin + s);
  var j = Math.floor(yin + s);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var t = (i + j) * G2;
  var X0 = i - t; // Unskew the cell origin back to (x,y) space
  var Y0 = j - t;
  var x0 = xin - X0; // The x,y distances from the cell origin
  var y0 = yin - Y0;
  // For the 2D case, the simplex shape is an equilateral triangle.
  // Determine which simplex we are in.
  var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
  if (x0 > y0) {
    i1 = 1; // lower triangle, XY order: (0,0)->(1,0)->(1,1)
    j1 = 0;
  } else {
    i1 = 0; // upper triangle, YX order: (0,0)->(0,1)->(1,1)
    j1 = 1;
  }
  // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
  // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
  // c = (3-sqrt(3))/6
  var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
  var y1 = y0 - j1 + G2;
  var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
  var y2 = y0 - 1 + 2 * G2;
  // Work out the hashed gradient indices of the three simplex corners
  var ii = i & 255;
  var jj = j & 255;
  var perm = this.permutations_;
  var gi0 = perm[ii + perm[jj]] % 12;
  var gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
  var gi2 = perm[ii + 1 + perm[jj + 1]] % 12;
  // Calculate the contribution from the three corners
  var t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 < 0) {
    n0 = 0;
  } else {
    t0 *= t0;
    // (x,y) of grad3 used for 2D gradient
    n0 = t0 * t0 * this.dot2d_(gi0, x0, y0);
  }
  var t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 < 0) {
    n1 = 0;
  } else {
    t1 *= t1;
    n1 = t1 * t1 * this.dot2d_(gi1, x1, y1);
  }
  var t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 < 0) {
    n2 = 0;
  } else {
    t2 *= t2;
    n2 = t2 * t2 * this.dot2d_(gi2, x2, y2);
  }
  // Add contributions from each corner to get the final noise value.
  // The result is scaled to return values in the interval [-1,1].
  return 70 * (n0 + n1 + n2);
};


/**
 * Samples the given 3D coordinates.
 * @param {number} xin X.
 * @param {number} yin Y.
 * @param {number} zin Z.
 * @return {number} Noise value.
 */
gf.math.SimplexNoise.prototype.sample3d = function(xin, yin, zin) {
  var n0, n1, n2, n3; // Noise contributions from the four corners
  // Skew the input space to determine which simplex cell we're in
  var F3 = 1 / 3;
  var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
  var i = Math.floor(xin + s);
  var j = Math.floor(yin + s);
  var k = Math.floor(zin + s);
  var G3 = 1 / 6; // Very nice and simple unskew factor, too
  var t = (i + j + k) * G3;
  var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
  var Y0 = j - t;
  var Z0 = k - t;
  var x0 = xin - X0; // The x,y,z distances from the cell origin
  var y0 = yin - Y0;
  var z0 = zin - Z0;
  // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
  // Determine which simplex we are in.
  var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
  var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; // X Y Z order
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; // X Z Y order
    } else {
      i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; // Z X Y order
    }
  } else { // x0<y0
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; // Z Y X order
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; // Y Z X order
    } else {
      i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; // Y X Z order
    }
  }
  // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
  // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
  // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
  // c = 1/6.
  var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
  var y1 = y0 - j1 + G3;
  var z1 = z0 - k1 + G3;
  var x2 = x0 - i2 + 2 * G3; // Offsets for third corner in (x,y,z) coords
  var y2 = y0 - j2 + 2 * G3;
  var z2 = z0 - k2 + 2 * G3;
  var x3 = x0 - 1 + 3 * G3; // Offsets for last corner in (x,y,z) coords
  var y3 = y0 - 1 + 3 * G3;
  var z3 = z0 - 1 + 3 * G3;
  // Work out the hashed gradient indices of the four simplex corners
  var ii = i & 255;
  var jj = j & 255;
  var kk = k & 255;
  var perm = this.permutations_;
  var gi0 = perm[ii + perm[jj + perm[kk]]] % 12;
  var gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
  var gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
  var gi3 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12;
  // Calculate the contribution from the four corners
  var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 < 0) {
    n0 = 0;
  } else {
    t0 *= t0;
    n0 = t0 * t0 * this.dot3d_(gi0, x0, y0, z0);
  }
  var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 < 0) {
    n1 = 0;
  } else {
    t1 *= t1;
    n1 = t1 * t1 * this.dot3d_(gi1, x1, y1, z1);
  }
  var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 < 0) {
    n2 = 0;
  } else {
    t2 *= t2;
    n2 = t2 * t2 * this.dot3d_(gi2, x2, y2, z2);
  }
  var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 < 0) {
    n3 = 0;
  } else {
    t3 *= t3;
    n3 = t3 * t3 * this.dot3d_(gi3, x3, y3, z3);
  }
  // Add contributions from each corner to get the final noise value.
  // The result is scaled to stay just inside [-1,1]
  return 32 * (n0 + n1 + n2 + n3);
};
