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

goog.provide('gf.net.Socket');

goog.require('gf.net.Packet');
goog.require('goog.Disposable');



/**
 * Abstract bidirectional network socket.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 */
gf.net.Socket = function(endpoint) {
  goog.base(this);

  /**
   * Endpoint this socket is connected to.
   * @type {gf.net.Endpoint}
   */
  this.endpoint = endpoint;

  /**
   * Whether this socket is a locally emulated network socket.
   * @type {boolean}
   */
  this.isLocal = false;

  /**
   * Socket state.
   * @type {gf.net.Socket.State}
   */
  this.state = gf.net.Socket.State.CONNECTING;

  /**
   * Whether new packets are available for reading.
   * @type {boolean}
   */
  this.canRead = false;

  /**
   * Amount of time to delay incoming/outgoing packets, in ms.
   * @type {number}
   */
  this.simulatedLatency = 0;

  /**
   * Interval used to flush writes.
   * Only started when simulated latency is requested.
   * @private
   * @type {?number}
   */
  this.simulationInterval_ = null;

  /**
   * Incoming packet queue.
   * @private
   * @type {!Array.<!gf.net.Packet>}
   */
  this.readQueue_ = [];

  /**
   * Queued writes, waiting for socket open.
   * @private
   * @type {!Array.<!gf.net.Packet>}
   */
  this.writeQueue_ = [];
};
goog.inherits(gf.net.Socket, goog.Disposable);


/**
 * @override
 */
gf.net.Socket.prototype.disposeInternal = function() {
  this.close();
  goog.base(this, 'disposeInternal');
};


/**
 * Socket state.
 * @enum {number}
 */
gf.net.Socket.State = {
  /**
   * Socket is waiting for the connection to be established.
   * All writes will be queued.
   */
  CONNECTING: 0,
  /**
   * Socket is connected.
   */
  CONNECTED: 1,
  /**
   * Socket has been closed.
   */
  CLOSED: 2
};


/**
 * Gets a random simulated latency timing.
 * @private
 * @return {number} A simulated latency timing, in ms.
 */
gf.net.Socket.prototype.getSimulatedLatency_ = function() {
  return this.simulatedLatency +
      (Math.random() - 0.5) * this.simulatedLatency / 2;
};


/**
 * Reads a data packet from the socket, if any is available.
 * @return {gf.net.Packet} New data, if available.
 */
gf.net.Socket.prototype.read = function() {
  if (!this.readQueue_.length) {
    return null;
  }

  // Only read packets received in the past (not future delayed packets)
  var packet = this.readQueue_[0];
  if (packet.timestamp <= goog.now()) {
    this.readQueue_.shift();
  } else {
    packet = null;
  }
  if (!this.readQueue_.length) {
    this.canRead = false;
  }

  return packet;
};


/**
 * Writes a data packet to the socket.
 * @param {!ArrayBuffer} data Data to write.
 */
gf.net.Socket.prototype.write = function(data) {
  var packet = new gf.net.Packet(data);

  if (this.simulatedLatency) {
    var latency = this.getSimulatedLatency_();
    packet.timestamp += latency;

    // Start interval if required
    if (this.simulationInterval_ === null) {
      this.simulationInterval_ = goog.global.setInterval(goog.bind(function() {
        if (this.state == gf.net.Socket.State.CONNECTED) {
          this.flush();
        }
      }, this), 5);
    }
  } else {
    // Stop interval
    if (this.simulationInterval_ !== null) {
      goog.global.clearInterval(this.simulationInterval_);
      this.simulationInterval_ = null;
    }
  }

  this.writeQueue_.push(packet);
  if (this.state == gf.net.Socket.State.CONNECTED) {
    this.flush();
  }
};


/**
 * Queues a read.
 * @protected
 * @param {!gf.net.Packet} packet Packet read.
 */
gf.net.Socket.prototype.queueRead = function(packet) {
  if (this.simulatedLatency) {
    var latency = this.getSimulatedLatency_();
    packet.timestamp += latency;
  }
  this.readQueue_.push(packet);
  this.canRead = true;
};


/**
 * Flushes all pending writes.
 * @param {boolean=} opt_force Forces even delayed packets to be written.
 */
gf.net.Socket.prototype.flush = function(opt_force) {
  var now = goog.now();
  while (this.writeQueue_.length) {
    var packet = this.writeQueue_[0];
    if (packet.timestamp > now && !opt_force) {
      break;
    }

    this.writeQueue_.shift();
    this.writeInternal(packet.data);
  }
};


/**
 * Writes data to the socket.
 * @protected
 * @param {!ArrayBuffer} data Data to write.
 */
gf.net.Socket.prototype.writeInternal = goog.abstractMethod;


/**
 * Closes the socket.
 */
gf.net.Socket.prototype.close = function() {
  if (this.state == gf.net.Socket.State.CLOSED) {
    return;
  }

  if (this.simulationInterval_ !== null) {
    goog.global.clearInterval(this.simulationInterval_);
    this.simulationInterval_ = null;
  }

  this.state = gf.net.Socket.State.CLOSED;
};
