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

goog.provide('gf.net.sockets.WsSocket');

goog.require('gf.log');
goog.require('gf.net.Packet');
goog.require('gf.net.Socket');
goog.require('gf.util.node');



/**
 * A socket using ws for network communication.
 *
 * @constructor
 * @extends {gf.net.Socket}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 * @param {!WsWebSocket} handle Underying socket handle.
 */
gf.net.sockets.WsSocket = function(endpoint, handle) {
  goog.base(this, endpoint);

  // Sockets start connected
  this.state = gf.net.Socket.State.CONNECTED;

  /**
   * Underlying port handle.
   * @private
   * @type {!WsWebSocket}
   */
  this.handle_ = handle;

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

  /**
   * Options used when writting messages to WS.
   * @private
   * @type {!gf.net.sockets.WsSocket.Options_}
   */
  this.writeOptions_ = {
    'binary': true,
    'mask': false
  };

  // Listen for messages
  this.handle_.addListener('error', this.boundHandleError_);
  this.handle_.addListener('close', this.boundHandleClose_);
  this.handle_.addListener('message', this.boundHandleMessage_);
};
goog.inherits(gf.net.sockets.WsSocket, gf.net.Socket);


/**
 * @private
 * @typedef {{
 *     binary: (boolean|undefined),
 *     mask: (boolean|undefined)
 * }}
 */
gf.net.sockets.WsSocket.Options_;


/**
 * Handles error notifications.
 * @private
 * @param {!Event} e Event.
 */
gf.net.sockets.WsSocket.prototype.handleError_ = function(e) {
  // TODO(benvanik): error
  gf.log.write('socket error', e);
};


/**
 * Handles close notifications.
 * @private
 * @param {!Event} e Event.
 */
gf.net.sockets.WsSocket.prototype.handleClose_ = function(e) {
  gf.log.write('socket closed', e['code']);
  this.close();
};


/**
 * Handles messages from the web socket.
 * @private
 * @param {!Buffer} data Data buffer.
 */
gf.net.sockets.WsSocket.prototype.handleMessage_ = function(data) {
  var packet = new gf.net.Packet(gf.util.node.bufferToArrayBuffer(data));
  this.queueRead(packet);
};


/**
 * @override
 */
gf.net.sockets.WsSocket.prototype.writeInternal = function(data) {
  this.handle_.send(gf.util.node.arrayBufferToBuffer(data), this.writeOptions_);
};


/**
 * @override
 */
gf.net.sockets.WsSocket.prototype.close = function() {
  this.handle_.removeListener('error', this.boundHandleError_);
  this.handle_.removeListener('close', this.boundHandleClose_);
  this.handle_.removeListener('message', this.boundHandleMessage_);
  this.handle_.close(0, '');

  goog.base(this, 'close');
};
