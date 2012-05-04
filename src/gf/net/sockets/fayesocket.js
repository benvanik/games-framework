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

goog.provide('gf.net.sockets.FayeSocket');

goog.require('gf.log');
goog.require('gf.net.Packet');
goog.require('gf.net.Socket');
goog.require('gf.util');
goog.require('gf.util.node');



/**
 * A socket using faye-websocket-node for network communication.
 *
 * @constructor
 * @extends {gf.net.Socket}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 * @param {!FayeWebSocket} handle Underying socket handle.
 */
gf.net.sockets.FayeSocket = function(endpoint, handle) {
  goog.base(this, endpoint);

  // Sockets start connected
  this.state = gf.net.Socket.State.CONNECTED;

  /**
   * Underlying port handle.
   * @private
   * @type {!FayeWebSocket}
   */
  this.handle_ = handle;

  /**
   * Whether the WebSocket will allow 'arraybuffer'.
   * This value is set based on whether or not we see strings or arraybuffers
   * coming from the client.
   * @private
   * @type {boolean}
   */
  this.canUseArrayBuffers_ = true;

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleError_ = goog.bind(this.handleError_, this);

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleClose_ = goog.bind(this.handleClose_, this);

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleMessage_ = goog.bind(this.handleMessage_, this);

  // Listen for messages
  this.handle_.onerror = this.boundHandleError_;
  this.handle_.onclose = this.boundHandleClose_;
  this.handle_.onmessage = this.boundHandleMessage_;
};
goog.inherits(gf.net.sockets.FayeSocket, gf.net.Socket);


/**
 * Handles error notifications.
 * @private
 * @param {!Event} e Event.
 */
gf.net.sockets.FayeSocket.prototype.handleError_ = function(e) {
  // TODO(benvanik): error
  gf.log.write('socket error', e);
};


/**
 * Handles close notifications.
 * @private
 * @param {!Event} e Event.
 */
gf.net.sockets.FayeSocket.prototype.handleClose_ = function(e) {
  gf.log.write('socket closed', e['code']);
  this.close();
};


/**
 * Handles messages from the web socket.
 * @private
 * @param {!Event} e Event.
 */
gf.net.sockets.FayeSocket.prototype.handleMessage_ = function(e) {
  var data = /** @type {Object} */ (e.data);

  var packet = null;
  if (data instanceof Buffer) {
    packet = new gf.net.Packet(gf.util.node.bufferToArrayBuffer(data));
  } else if (goog.isString(data)) {
    this.canUseArrayBuffers_ = false;
    packet = new gf.net.Packet(gf.util.stringToArrayBuffer(
        /** @type {string} */ (data)));
  }

  if (packet) {
    this.queueRead(packet);
  }
};


/**
 * @override
 */
gf.net.sockets.FayeSocket.prototype.writeInternal = function(data) {
  if (this.canUseArrayBuffers_) {
    this.handle_.send(gf.util.node.arrayBufferToBuffer(data));
  } else {
    this.handle_.send(gf.util.arrayBufferToString(data));
  }
};


/**
 * @override
 */
gf.net.sockets.FayeSocket.prototype.close = function() {
  this.handle_.onerror = null;
  this.handle_.onclose = null;
  this.handle_.onmessage = null;
  this.handle_.close();

  goog.base(this, 'close');
};
