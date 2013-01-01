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

goog.provide('gf.net.sockets.WsListenSocket');

goog.require('gf.net.ListenSocket');
goog.require('gf.net.sockets.WsSocket');



/**
 * ws listen socket.
 *
 * @constructor
 * @extends {gf.net.ListenSocket}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 */
gf.net.sockets.WsListenSocket = function(endpoint) {
  goog.base(this, endpoint);

  var WsWebSocketServer =
      /** @type {!function(new:WsWebSocketServer, {port: number})} */ (
      require('ws')['Server']);

  /**
   * Underlying worker global scope.
   * @private
   * @type {!WsWebSocketServer}
   */
  this.handle_ = new WsWebSocketServer({
    'host': undefined,
    'port': Number(endpoint)
  });

  /**
   * @private
   * @type {function(!WsWebSocket): void}
   */
  this.boundHandleConnection_ = goog.bind(this.handleConnection_, this);

  // Listen for connections
  this.handle_.addListener('connection', this.boundHandleConnection_);
};
goog.inherits(gf.net.sockets.WsListenSocket, gf.net.ListenSocket);


/**
 * Handles connection requests.
 * @private
 * @param {!WsWebSocket} ws WebSocket connection.
 */
gf.net.sockets.WsListenSocket.prototype.handleConnection_ = function(ws) {
  var socket = new gf.net.sockets.WsSocket(
      /** @type {gf.net.Endpoint} */ (ws), ws);
  this.dispatchConnect(socket);
};


/**
 * @override
 */
gf.net.sockets.WsListenSocket.prototype.close = function() {
  if (!this.connected) {
    return;
  }
  this.connected = false;

  this.handle_.removeListener('connection', this.boundHandleConnection_);
  this.handle_.close();
};
