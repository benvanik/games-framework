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

goog.provide('gf.net.ListenSocket');

goog.require('goog.Disposable');



/**
 * Abstract listening socket.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 */
gf.net.ListenSocket = function(endpoint) {
  goog.base(this);

  /**
   * Endpoint this socket is listening on.
   * @type {gf.net.Endpoint}
   */
  this.endpoint = endpoint;

  /**
   * Whether the socket is currently connected.
   * @type {boolean}
   */
  this.connected = true;

  /**
   * Incoming connection queue, used when there is no connect callback defined.
   * @private
   * @type {!Array.<!gf.net.Socket>}
   */
  this.connectQueue_ = [];

  /**
   * Callback for connection events.
   * @private
   * @type {(function(!gf.net.Socket):void)?}
   */
  this.connectCallback_ = null;
};
goog.inherits(gf.net.ListenSocket, goog.Disposable);


/**
 * @override
 */
gf.net.ListenSocket.prototype.disposeInternal = function() {
  this.close();
  this.connectCallback_ = null;
  goog.base(this, 'disposeInternal');
};


/**
 * Begins listening for connections.
 * @param {(function(!gf.net.Socket):void)?} callback Callback for
 *     connection events.
 */
gf.net.ListenSocket.prototype.begin = function(callback) {
  this.connectCallback_ = callback;

  // Process any pending connections
  if (callback) {
    while (this.connectQueue_.length) {
      var socket = this.connectQueue_.shift();
      callback.call(null, socket);
    }
  }
};


/**
 * Dispatches connection events.
 * @param {!gf.net.Socket} socket Newly connected socket.
 */
gf.net.ListenSocket.prototype.dispatchConnect = function(socket) {
  if (this.connectCallback_) {
    this.connectCallback_.call(null, socket);
  } else {
    this.connectQueue_.push(socket);
  }
};


/**
 * Closes the socket and stops listening.
 */
gf.net.ListenSocket.prototype.close = goog.abstractMethod;
