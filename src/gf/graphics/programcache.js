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

goog.provide('gf.graphics.ProgramCache');

goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.userAgent.product');



/**
 * A simple program cache, allowing for optimized async loading.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 */
gf.graphics.ProgramCache = function(graphicsContext) {
  goog.base(this);

  /**
   * Target graphics context.
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext = graphicsContext;

  /**
   * A list of all the programs in the cache.
   * @private
   * @type {!Array.<!gf.graphics.Program>}
   */
  this.programs_ = [];
};
goog.inherits(gf.graphics.ProgramCache, goog.Disposable);


/**
 * @override
 */
gf.graphics.ProgramCache.prototype.disposeInternal = function() {
  goog.array.forEach(this.programs_, goog.dispose);
  this.programs_.length = 0;
  goog.base(this, 'disposeInternal');
};


/**
 * Registers a program with the cache.
 * @param {!gf.graphics.Program} program Program to register.
 */
gf.graphics.ProgramCache.prototype.register = function(program) {
  goog.asserts.assert(!goog.array.contains(this.programs_, program));
  this.programs_.push(program);
};


/**
 * Performs the initial setup of all programs in the cache.
 * @param {boolean} opt_forceSync Force synchronous loading.
 * @return {!goog.async.Deferred} A deferred fulfilled when all programs have
 *     compiled and linked.
 */
gf.graphics.ProgramCache.prototype.setup = function(opt_forceSync) {
  var gl = this.graphicsContext.gl;

  var deferred = new goog.async.Deferred();

  // Run the first pass - this sets up compiling/linking for all programs
  // and kicks off the processing
  for (var n = 0; n < this.programs_.length; n++) {
    this.programs_[n].beginRestoring();
  }

  // Gather the results - this is a blocking behavior
  // We wait a js tick or two with the hope of letting more setup code run
  // while we are waiting for the results. On Chrome, which does shader
  // compiling async this can save a lot of time.
  // Unfortunately all other browsers are synchronous, and introducing a delay
  // here is a bad thing.
  if (goog.userAgent.product.CHROME && !opt_forceSync) {
    goog.Timer.callOnce(function() {
      this.completeSetup_(deferred);
    }, 5, this);
  } else {
    this.completeSetup_(deferred);
  }

  return deferred;
};


/**
 * Completes setup.
 * This performs the endRestoring pass of program setup.
 * @private
 * @param {!goog.async.Deferred} deferred Deferred to signal with setup results.
 */
gf.graphics.ProgramCache.prototype.completeSetup_ = function(deferred) {
  for (var n = 0; n < this.programs_.length; n++) {
    var program = this.programs_[n];
    try {
      if (!program.endRestoring()) {
        deferred.errback(false);
        break;
      }
    } catch (e) {
      // Die after the first error
      deferred.errback(e);
      break;
    }
  }
  if (!deferred.hasFired()) {
    deferred.callback(null);
  }
};
