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

goog.provide('gf.timing.Clock');

goog.require('gf');
goog.require('goog.asserts');



// TODO(benvanik): fix this clock, it's all messed up
// Need to do something much more structured such that it's impossible for
// debugging to cause errors - perhaps manually step the clock instead of ever
// using gf.now, ensuring that code always captures time at the start of js
// exec instead of randomly inside it, etc
/**
 * Clock provider.
 * Allows for sampling of fixed timestep times, local client times, and
 * synchronized server times.
 *
 * TODO(benvanik): detect drift in clock
 * TODO(benvanik): lerp between gametimes to prevent negative deltas/etc
 *
 * @constructor
 */
gf.timing.Clock = function() {
  /**
   * UNIX time used as the base for all time queries.
   * @private
   * @type {number}
   */
  this.timeBase_ = gf.now();

  /**
   * Game simulation time, in seconds.
   * @private
   * @type {number}
   */
  this.gameTime_ = 0;

  /**
   * Estimated latency, in seconds.
   * @type {number}
   */
  this.latency = 0;

  /**
   * Time difference between the client and the server.
   * @private
   * @type {number}
   */
  this.clockDelta_ = 0;

  /**
   * Whether the clock has received server time yet.
   * @private
   * @type {boolean}
   */
  this.hasGotTime_ = false;
};


/**
 * Number of seconds that will cause a clock reset. If the server and client
 * times differ by more than this amount then we assume that we've gone crazy
 * and will snap reset everything.
 * @private
 * @const
 * @type {number}
 */
gf.timing.Clock.MAX_TIME_DIFF_ = 0.300;


/**
 * Gets the total amount of time the application has been running, in seconds.
 * @return {number} Run time, in seconds.
 */
gf.timing.Clock.prototype.getClientTime = function() {
  return (gf.now() - this.timeBase_) / 1000;
};


/**
 * Gets the current estimated time on the server, in seconds.
 * This time should be used when sending or receiving times in network packets,
 * or interpolating times received from the network.
 * @return {number} Server time, in seconds.
 */
gf.timing.Clock.prototype.getServerTime = function() {
  if (gf.CLIENT && !this.hasGotTime_) {
    // Always return zero until the time comes from the server
    return 0;
  }
  var clientTime = this.getClientTime();
  return clientTime + this.clockDelta_;
};


/**
 * Gets the current game simulation time, in seconds.
 * This time should be used when running physics or other calculations, as it
 * factors in fixed timestep processing/etc. It matches the server time, but
 * will only update when a simulation tick occurs.
 * @return {number} Game simulation time, in seconds.
 */
gf.timing.Clock.prototype.getGameTime = function() {
  return this.gameTime_;
};


/**
 * Steps the simulation time by the given amount.
 * @param {number} timeDelta Simulation time delta.
 */
gf.timing.Clock.prototype.stepGameTime = function(timeDelta) {
  this.gameTime_ += timeDelta;
};


/**
 * Updates the current timing information from the network.
 * @param {number} serverTime Time received from the server, in seconds.
 * @param {number} latency Estimated latency (one direction), in seconds.
 */
gf.timing.Clock.prototype.updateServerTime = function(serverTime, latency) {
  this.latency = latency;

  goog.asserts.assert(serverTime);

  // Prevent moving time backwards - this will wait until we have caught up
  // with the server time
  var newTime = serverTime + latency;
  if (newTime < this.gameTime_) {
    newTime = this.gameTime_;
  }
  this.gameTime_ = newTime;

  var clientTime = this.getClientTime();
  var newDelta = this.gameTime_ - clientTime;
  var deltaDiff = newDelta - this.clockDelta_;
  if (Math.abs(deltaDiff) > gf.timing.Clock.MAX_TIME_DIFF_) {
    // Clock was way out of sync - reset
    this.clockDelta_ = newDelta;
  } else if (deltaDiff > 0) {
    // Drift towards the right value
    this.clockDelta_ += 1 / 1000;
  } else {
    // Drift towards the right value
    this.clockDelta_ -= 1 / 1000;
  }

  this.hasGotTime_ = true;
};
