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
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either exgmess or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Seedable PRNG.
 *
 * Code derived from the Alea implementation available at:
 * http://baagoe.com/en/RandomMusings/javascript/Alea.js
 * Johannes BaagÃ¸e <baagoe@baagoe.com>, 2010
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.math.Random');
goog.provide('gf.math.RandomSource');



/**
 * A source of random numbers.
 * @interface
 */
gf.math.RandomSource = function() {};


/**
 * Generates a new 32-bit floating point random number.
 * @return {number} A random number in [0-1].
 */
gf.math.RandomSource.prototype.random = goog.abstractMethod;



/**
 * A simple seedable PRNG.
 *
 * TODO(benvanik): evaluate de.polygonal.math.PM_PRNG as it may be much faster:
 * http://code.google.com/p/chinesechessjam/source/browse/trunk/CCJ/src/de/polygonal/math/PM_PRNG.as
 *
 * @constructor
 * @implements {gf.math.RandomSource}
 * @param {number=} opt_seed Optional seed value.
 */
gf.math.Random = function(opt_seed) {
  /**
   * @private
   * @type {number}
   */
  this.s0_ = gf.math.Random.mash_(32);

  /**
   * @private
   * @type {number}
   */
  this.s1_ = gf.math.Random.mash_(32);

  /**
   * @private
   * @type {number}
   */
  this.s2_ = gf.math.Random.mash_(32);

  /**
   * @private
   * @type {number}
   */
  this.c_ = 1;

  var seed = goog.isDef(opt_seed) ? opt_seed : goog.now();
  this.s0_ -= gf.math.Random.mash_(seed);
  if (this.s0_ < 0) {
    this.s0_ += 1;
  }
  this.s1_ -= gf.math.Random.mash_(seed);
  if (this.s1_ < 0) {
    this.s1_ += 1;
  }
  this.s2_ -= gf.math.Random.mash_(seed);
  if (this.s2_ < 0) {
    this.s2_ += 1;
  }

  for (var n = 0; n < 100; n++) {
    this.random();
  }
};


/**
 * Hashes a value for initializing the PRNG.
 * @private
 * @param {number} data Source data.
 * @return {number} Mashed value.
 */
gf.math.Random.mash_ = function(data) {
  // TODO(benvanik): this is stupid
  var str = data.toString();
  var n = 0xefc8249d;
  for (var i = 0; i < str.length; i++) {
    n += str.charCodeAt(i);
    var h = 0.02519603282416938 * n;
    n = h >>> 0;
    h -= n;
    h *= n;
    n = h >>> 0;
    h -= n;
    n += h * 0x100000000; // 2^32
  }
  return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
};


/**
 * Generates a new 32-bit floating point random number.
 * @return {number} A random number in [0-1].
 */
gf.math.Random.prototype.random = function() {
  var t = 2091639 * this.s0_ + this.c_ * 2.3283064365386963e-10; // 2^-32
  this.s0_ = this.s1_;
  this.s1_ = this.s2_;
  return this.s2_ = t - (this.c_ = t | 0);
};


/**
 * Generates a new unsigned integer random number.
 * @param {number} max Maximum value of the number.
 * @return {number} A random number in [0-max].
 */
gf.math.Random.prototype.nextUint = function(max) {
  return (this.random() * 0x100000000) % (Math.round(max) + 1);
};


/**
 * Generates a new 8-bit unsigned integer random number.
 * @return {number} A random number in [0-255].
 */
gf.math.Random.prototype.nextUint8 = function() {
  return this.random() * 0x100;
};


/**
 * Generates a new 16-bit unsigned integer random number.
 * @return {number} A random number in [0-65535].
 */
gf.math.Random.prototype.nextUint16 = function() {
  return this.random() * 0x10000;
};


/**
 * Generates a new 32-bit unsigned integer random number.
 * @return {number} A random number in [0-4294967295].
 */
gf.math.Random.prototype.nextUint32 = function() {
  return this.random() * 0x100000000;
};
