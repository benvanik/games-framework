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

goog.provide('gf.net.Statistics');



/**
 * Network statistics information.
 *
 * @constructor
 */
gf.net.Statistics = function() {
  /**
   * Average round trip time, in ms.
   * @type {number}
   */
  this.averageLatency = 0;

  /**
   * @type {number}
   */
  this.minimumLatency = 0;

  /**
   * @type {number}
   */
  this.maximumLatency = 0;

  /**
   * @type {number}
   */
  this.downstreamBandwidth = 0;

  /**
   * @type {number}
   */
  this.upstreamBandwidth = 0;

  /**
   * Total number of bytes received by the user from the server.
   * Does not include socket overhead/etc.
   * @type {number}
   */
  this.bytesReceived = 0;

  /**
   * Total number of bytes sent from the user to the server.
   * Does not include socket overhead/etc.
   * @type {number}
   */
  this.bytesSent = 0;
};


/**
 * Deep-clones the object.
 * @return {!gf.net.Statistics} Cloned object.
 */
gf.net.Statistics.prototype.clone = function() {
  // TODO(benvanik): clone
  return new gf.net.Statistics();
};


/**
 * Converts the object to a human-readable string.
 * @return {string} Human-readable string representation.
 */
gf.net.Statistics.prototype.toString = function() {
  // TODO(benvanik): toString
  return '[stats]';
};


/**
 * Updates the statistics with the new latency value.
 * @param {number} latency Estimated latency, in ms.
 */
gf.net.Statistics.prototype.updateLatency = function(latency) {
  // Rolling average, unless its the first update
  if (this.averageLatency) {
    this.averageLatency = (this.averageLatency + latency) / 2;
  } else {
    this.averageLatency = latency;
  }
  this.minimumLatency = Math.min(this.minimumLatency, latency);
  this.maximumLatency = Math.max(this.maximumLatency, latency);
};
