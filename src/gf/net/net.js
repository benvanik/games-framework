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

goog.provide('gf.net');
goog.provide('gf.net.Endpoint');

goog.require('gf.net.Browser');
goog.require('gf.net.ClientSession');
goog.require('gf.net.ServerSession');
goog.require('gf.net.SessionState');
goog.require('gf.net.sockets.FayeListenSocket');
goog.require('gf.net.sockets.HtmlWebSocket');
goog.require('gf.net.sockets.PortSocket');
goog.require('gf.net.sockets.WorkerListenSocket');
goog.require('gf.util');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');


/**
 * Endpoint type.
 * @typedef {string|MessagePort|Worker|SharedWorker|DedicatedWorkerGlobalScope|
 *     SharedWorkerGlobalScope}
 */
gf.net.Endpoint;


/**
 * Connects to a server browser at the given endpoint.
 *
 * @param {string} endpoint Browser service endpoint.
 * @param {!gf.net.AuthToken} authToken Authentication information.
 * @return {!goog.async.Deferred} A deferred called back when the browser is
 *     connected. If successful a {@see gf.net.Browser} will be passed as the
 *     only argument.
 */
gf.net.createBrowser = function(endpoint, authToken) {
  // TODO(benvanik): create browser
  var browser = new gf.net.Browser();
  return goog.async.Deferred.fail(null);
};


/**
 * Begins a new server listening on the given endpoint.
 *
 * @param {gf.net.Endpoint} endpoint Local service endpoint to listen on.
 * @param {number} protocolVersion Application protocol version.
 * @param {!gf.net.AuthToken} authToken Authentication information.
 * @param {!gf.net.ServerInfo} serverInfo Server session information.
 * @return {!goog.async.Deferred} A deferred called back when the server is
 *     listening. If successful a {@see gf.net.ServerSession} will be assed as
 *     the only argument.
 */
gf.net.listen = function(endpoint, protocolVersion, authToken, serverInfo) {
  // Create the underlying listen socket based on endpoint type
  var socket = null;
  if (gf.util.isAnyType(endpoint, [
    'DedicatedWorkerContext',
    'DedicatedWorkerGlobalScope',
    'SharedWorkerContext',
    'SharedWorkerGlobalScope'
  ])) {
    socket = new gf.net.sockets.WorkerListenSocket(endpoint,
        /** @type {!Object} */ (endpoint));
  } else if (goog.isString(endpoint)) {
    socket = new gf.net.sockets.FayeListenSocket(endpoint);
    //socket = new gf.net.sockets.WsListenSocket(endpoint);
  } else {
    // Unsupported endpoint
    return goog.async.Deferred.fail(null);
  }
  goog.asserts.assert(socket);

  // Create session
  var serverSession = new gf.net.ServerSession(socket, protocolVersion,
      authToken, serverInfo);

  // TODO(benvanik): wait until session is established
  return goog.async.Deferred.succeed(serverSession);
};


/**
 * Connects to an existing game server at the given endpoint.
 *
 * @param {gf.net.Endpoint} endpoint Server endpoint or port to connect to.
 * @param {number} protocolVersion Application protocol version.
 * @param {!gf.net.AuthToken} authToken Authentication information.
 * @param {!gf.net.UserInfo} userInfo Client user information.
 * @return {!goog.async.Deferred} A deferred called back when the connection has
 *     completed. If successful a {@see gf.net.ClientSession} will be passed as
 *     the only argument.
 */
gf.net.connect = function(endpoint, protocolVersion, authToken, userInfo) {
  // Create the underlying socket based on endpoint type
  var socket = null;
  if (gf.util.isAnyType(endpoint, [
    'Worker',
    'SharedWorker',
    'MessagePort'
  ])) {
    socket = new gf.net.sockets.PortSocket(endpoint,
        /** @type {!Worker|!SharedWorker|!MessagePort} */ (endpoint));
  } else if (goog.isString(endpoint)) {
    socket = new gf.net.sockets.HtmlWebSocket(endpoint);
  } else {
    // Unsupported endpoint
    return goog.async.Deferred.fail(null);
  }
  goog.asserts.assert(socket);

  // Create session
  var clientSession = new gf.net.ClientSession(socket, protocolVersion,
      authToken, userInfo);
  var waitDeferred = clientSession.waitForConnect();

  // Poll the session until we change state
  var pollInterval = goog.global.setInterval(function() {
    if (clientSession.state == gf.net.SessionState.CONNECTING) {
      clientSession.poll();
    }
    if (clientSession.state != gf.net.SessionState.CONNECTING) {
      goog.global.clearInterval(pollInterval);
    }
  }, 16);

  return waitDeferred;
};
