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

goog.provide('gf.net.sockets.FayeListenSocket');

goog.require('gf.net.ListenSocket');
goog.require('gf.net.sockets.FayeSocket');



/**
 * faye-websocket-node listen socket.
 *
 * @constructor
 * @extends {gf.net.ListenSocket}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 */
gf.net.sockets.FayeListenSocket = function(endpoint) {
  goog.base(this, endpoint);

  var http = /** @type {!HttpModule} */ (require('http'));

  /**
   * Underlying worker global scope.
   * @private
   * @type {!Server}
   */
  this.handle_ = http.createServer();
  this.handle_.listen(Number(endpoint));

  /**
   * @private
   * @type {function(!Object): void}
   */
  this.boundHandleUpgrade_ = goog.bind(this.handleUpgrade_, this);

  // Listen for connections
  this.handle_.addListener('upgrade', this.boundHandleUpgrade_);
};
goog.inherits(gf.net.sockets.FayeListenSocket, gf.net.ListenSocket);


/**
 * Handles messages from the port.
 * @private
 * @param {!Object} request HTTP request.
 * @param {!Socket} socket Net socket.
 * @param {!Object} head HTTP headers.
 */
gf.net.sockets.FayeListenSocket.prototype.handleUpgrade_ =
    function(request, socket, head) {
  // TODO(benvanik): subpaths/etc

  // Disable Nagle algorithm
  socket.setNoDelay(true);
  socket.setKeepAlive(true);
  socket.setTimeout(0);

  var FayeWebSocket =
      /** @type {!function(new:FayeWebSocket, Object, Object, Object)} */ (
      require('faye-websocket'));
  var ws = new FayeWebSocket(request, socket, head);

  var fayeSocket = new gf.net.sockets.FayeSocket(
      /** @type {gf.net.Endpoint} */ (ws), ws);
  this.dispatchConnect(fayeSocket);
};


/**
 * @override
 */
gf.net.sockets.FayeListenSocket.prototype.close = function() {
  if (!this.connected) {
    return;
  }
  this.connected = false;

  this.handle_.removeListener('upgrade', this.boundHandleUpgrade_);
  this.handle_.close();
};
