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

goog.provide('gf.net.sockets.WorkerListenSocket');

goog.require('gf.net.ListenSocket');
goog.require('gf.net.sockets.PortSocket');
goog.require('gf.util');
goog.require('goog.asserts');



/**
 * HTML5 Web Worker listen socket.
 *
 * @constructor
 * @extends {gf.net.ListenSocket}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 * @param {!Object} handle Underlying worker handle.
 */
gf.net.sockets.WorkerListenSocket = function(endpoint, handle) {
  goog.base(this, endpoint);

  /**
   * Underlying worker global scope.
   * @private
   * @type {!Object}
   */
  this.handle_ = handle;

  /**
   * @private
   * @type {function(!MessageEvent): void}
   */
  this.boundHandleConnect_ = goog.bind(this.handleConnect_, this);

  // Listen for connections
  this.handle_.addEventListener('connect', this.boundHandleConnect_, false);

  // If a dedicated worker, always fire a connect event
  if (goog.global['WorkerLocation']) {
    var socket = new gf.net.sockets.PortSocket(
        /** @type {gf.net.Endpoint} */ (handle),
        /** @type {!MessagePort|!Worker|!SharedWorker} */ (handle));
    this.dispatchConnect(socket);
  }
};
goog.inherits(gf.net.sockets.WorkerListenSocket, gf.net.ListenSocket);


/**
 * Handles messages from the port.
 * @private
 * @param {!MessageEvent} e Event.
 */
gf.net.sockets.WorkerListenSocket.prototype.handleConnect_ = function(e) {
  var port = e.ports[0];
  goog.asserts.assert(port);
  var socket = new gf.net.sockets.PortSocket(
      /** @type {gf.net.Endpoint} */ (port), port);
  this.dispatchConnect(socket);
};


/**
 * @override
 */
gf.net.sockets.WorkerListenSocket.prototype.close = function() {
  if (!this.connected) {
    return;
  }
  this.connected = false;

  this.handle_.removeEventListener('connect',
      /** @type {(function((Event|null)):(boolean|undefined))?} */ (
      this.boundHandleConnect_), false);
};
