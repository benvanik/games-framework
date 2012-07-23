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

goog.provide('gf.sim.Statistics');

goog.require('gf');



/**
 * Basic statistics about the simulation.
 *
 * @constructor
 */
gf.sim.Statistics = function() {
  /**
   * @type {number}
   */
  this.entityCreates = 0;

  /**
   * @type {number}
   */
  this.entityCreateSize = 0;

  /**
   * @type {number}
   */
  this.entityUpdates = 0;

  /**
   * @type {number}
   */
  this.entityUpdateSize = 0;

  /**
   * @type {number}
   */
  this.entityDeletes = 0;

  /**
   * @type {number}
   */
  this.entityDeleteSize = 0;

  /**
   * @type {number}
   */
  this.incomingCommands = 0;

  /**
   * @type {number}
   */
  this.incomingCommandSize = 0;

  /**
   * @type {number}
   */
  this.outgoingCommands = 0;

  /**
   * @type {number}
   */
  this.outgoingCommandSize = 0;

  // TODO(benvanik): # of update ticks

  /**
   * @type {number}
   */
  this.incomingBps = 0;

  /**
   * @type {number}
   */
  this.outgoingBps = 0;

  /**
   * @private
   * @type {number}
   */
  this.incomingBpsSum_ = 0;

  /**
   * @private
   * @type {number}
   */
  this.outgoingBpsSum_ = 0;

  /**
   * @private
   * @type {number}
   */
  this.lastTime_ = 0;
};


/**
 * Updates statistics by resetting instantaneous and averaging others.
 * @param {number} time Current frame time.
 */
gf.sim.Statistics.prototype.update = function(time) {
  if (gf.SERVER) {
    this.outgoingBpsSum_ += this.entityCreateSize;
    this.outgoingBpsSum_ += this.entityUpdateSize;
    this.outgoingBpsSum_ += this.entityDeleteSize;
  } else {
    this.incomingBpsSum_ += this.entityCreateSize;
    this.incomingBpsSum_ += this.entityUpdateSize;
    this.incomingBpsSum_ += this.entityDeleteSize;
  }
  this.incomingBpsSum_ += this.incomingCommandSize;
  this.outgoingBpsSum_ += this.outgoingCommandSize;

  if (time - this.lastTime_ >= 1) {
    this.lastTime_ = time;
    this.incomingBps = this.incomingBpsSum_;
    this.outgoingBps = this.outgoingBpsSum_;
    this.incomingBpsSum_ = 0;
    this.outgoingBpsSum_ = 0;
  }

  this.entityCreates = this.entityCreateSize = 0;
  this.entityUpdates = this.entityUpdateSize = 0;
  this.entityDeletes = this.entityDeleteSize = 0;
  this.incomingCommands = this.incomingCommandSize = 0;
  this.outgoingCommands = this.outgoingCommandSize = 0;
};


/**
 * Pads a number with spaces.
 * @private
 * @param {number} number Input number.
 * @param {number} digits Digits to pad to.
 * @return {string} Padding number.
 */
gf.sim.Statistics.pad_ = function(number, digits) {
  var s = String(number);
  while (s.length < digits) {
    s = ' ' + s;
  }
  return s;
};


/**
 * Gets a debug information string that can be printed to the console.
 * @return {string} Debug info.
 */
gf.sim.Statistics.prototype.getDebugInfo = function() {
  return [
    'i/s:',
    gf.sim.Statistics.pad_(Math.round(this.incomingBps), 4),
    ' o/s:',
    gf.sim.Statistics.pad_(Math.round(this.outgoingBps), 4),
    ' ec:',
    gf.sim.Statistics.pad_(this.entityCreates, 2),
    '/',
    gf.sim.Statistics.pad_(this.entityCreateSize, 4),
    ' eu:',
    gf.sim.Statistics.pad_(this.entityUpdates, 2),
    '/',
    gf.sim.Statistics.pad_(this.entityUpdateSize, 4),
    ' ed:',
    gf.sim.Statistics.pad_(this.entityDeletes, 2),
    '/',
    gf.sim.Statistics.pad_(this.entityDeleteSize, 4),
    ' ic:',
    gf.sim.Statistics.pad_(this.incomingCommands, 2),
    '/',
    gf.sim.Statistics.pad_(this.incomingCommandSize, 4),
    ' oc:',
    gf.sim.Statistics.pad_(this.outgoingCommands, 2),
    '/',
    gf.sim.Statistics.pad_(this.outgoingCommandSize, 4)
  ].join('');
};
