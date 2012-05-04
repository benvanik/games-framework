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

goog.provide('gf.util.FeatureDetector');

goog.require('goog.async.Deferred');



/**
 * A base class for feature detection functionality.
 * Designed to handle asynchronous detection processes (where detection may
 * take time) and handle multiple overlapping detection requests. Subclasses
 * should be instantiated only once and reused to ensure detection does not
 * occur multiple times.
 *
 * @constructor
 */
gf.util.FeatureDetector = function() {
  /**
   * Whether detection has completed.
   * @type {boolean}
   */
  this.hasDetected = false;

  /**
   * A deferred that will be signaled once detection has completed.
   * @private
   * @type {goog.async.Deferred}
   */
  this.deferred_ = null;

  /**
   * The error argument that was pased back if the detection failed.
   * @private
   * @type {*}
   */
  this.detectionError_ = null;

  /**
   * A list of waiting deferreds that should be signaled when detection
   * completes.
   * @private
   * @type {!Array.<!goog.async.Deferred>}
   */
  this.waiters_ = [];
};


/**
 * Begins the detection logic.
 * @return {!goog.async.Deferred} A deferred fulfilled when detection has
 *     completed. Depending on the detection logic or whether detection results
 *     are cached this may complete immediately.
 */
gf.util.FeatureDetector.prototype.detect = function() {
  var deferred = new goog.async.Deferred();
  if (this.hasDetected) {
    if (!this.detectionError_) {
      deferred.callback(null);
    } else {
      deferred.errback(this.detectionError_);
    }
  } else {
    this.waiters_.push(deferred);
    if (!this.deferred_) {
      this.deferred_ = this.detectInternal();
      this.deferred_.addCallbacks(
          function() {
            this.hasDetected = true;
            this.detectionError_ = null;
            for (var n = 0; n < this.waiters_.length; n++) {
              var waiter = this.waiters_[n];
              waiter.callback(null);
            }
            this.waiters_.length = 0;
          },
          function(arg) {
            this.hasDetected = true;
            this.detectionError_ = arg;
            for (var n = 0; n < this.waiters_.length; n++) {
              var waiter = this.waiters_[n];
              waiter.errback(arg);
            }
            this.waiters_.length = 0;
          }, this);
    }
  }
  return deferred;
};


/**
 * Begins the detector-specific detection logic.
 * @protected
 * @return {!goog.async.Deferred} A deferred fulfilled when detection has
 *     completed.
 */
gf.util.FeatureDetector.prototype.detectInternal = goog.abstractMethod;
