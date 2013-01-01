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

goog.provide('gf.net.sockets.HtmlWebSocket');

goog.require('gf.log');
goog.require('gf.net.Packet');
goog.require('gf.net.Socket');
goog.require('gf.util');



/**
 * A socket using HTML5 WebSockets for network communication.
 *
 * @constructor
 * @extends {gf.net.Socket}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 */
gf.net.sockets.HtmlWebSocket = function(endpoint) {
  goog.base(this, endpoint);

  /**
   * Underlying port handle.
   * @private
   * @type {!WebSocket}
   */
  this.handle_ = new WebSocket(/** @type {string} */ (endpoint));
  this.handle_['binaryType'] = 'arraybuffer';

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleOpen_ = goog.bind(this.handleOpen_, this);

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
  this.handle_.addEventListener('open', this.boundHandleOpen_, false);
  this.handle_.addEventListener('error', this.boundHandleError_, false);
  this.handle_.addEventListener('close', this.boundHandleClose_, false);
  this.handle_.addEventListener('message', this.boundHandleMessage_, false);
};
goog.inherits(gf.net.sockets.HtmlWebSocket, gf.net.Socket);


/**
 * Handles open notifications.
 * @private
 * @param {Event} e Event.
 */
gf.net.sockets.HtmlWebSocket.prototype.handleOpen_ = function(e) {
  // Drain waiting queue
  this.state = gf.net.Socket.State.CONNECTED;
  this.flush();
};


/**
 * Handles error notifications.
 * @private
 * @param {Event} e Event.
 */
gf.net.sockets.HtmlWebSocket.prototype.handleError_ = function(e) {
  // TODO(benvanik): error
  gf.log.write('error', e);
};


/**
 * Handles close notifications.
 * @private
 * @param {Event} e Event.
 */
gf.net.sockets.HtmlWebSocket.prototype.handleClose_ = function(e) {
  gf.log.write('close', e);
  this.close();
};


/**
 * Handles messages from the web socket.
 * @private
 * @param {Event} e Event.
 */
gf.net.sockets.HtmlWebSocket.prototype.handleMessage_ = function(e) {
  var data = /** @type {Object} */ (e.data);

  var packet = null;
  if (data instanceof ArrayBuffer) {
    packet = new gf.net.Packet(data);
  } else if (goog.isString(data)) {
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
gf.net.sockets.HtmlWebSocket.prototype.writeInternal = function(data) {
  if (this.handle_.readyState != 1) {
    this.close();
    return;
  }

  this.handle_.send(/** @type {string} */ (data));
};


/**
 * @override
 */
gf.net.sockets.HtmlWebSocket.prototype.close = function() {
  this.handle_.removeEventListener('open', this.boundHandleOpen_, false);
  this.handle_.removeEventListener('error', this.boundHandleError_, false);
  this.handle_.removeEventListener('close', this.boundHandleClose_, false);
  this.handle_.removeEventListener('message', this.boundHandleMessage_, false);
  this.handle_.close();

  goog.base(this, 'close');
};
