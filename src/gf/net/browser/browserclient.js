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

goog.provide('gf.net.browser.BrowserClient');

goog.require('gf');
goog.require('gf.net.http');
goog.require('goog.Disposable');
goog.require('goog.json');



/**
 * Server browser client.
 * Used by servers to register and maintain their status in the database.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} baseUrl Base browser HTTP endpoint with a trailing slash.
 * @param {string} serverId Server UUID.
 * @param {string} serverKey Server key.
 */
gf.net.browser.BrowserClient = function(baseUrl, serverId, serverKey) {
  goog.base(this);

  /**
   * Base browser HTTP endpoint.
   * @private
   * @type {string}
   */
  this.baseUrl_ = baseUrl;

  /**
   * A URL for the server this browser is registered to.
   * @private
   * @type {string}
   */
  this.serverUrl_ = baseUrl + 'api/server/' + serverId;

  /**
   * Additional HTTP headers.
   * @private
   * @type {!Object.<string>}
   */
  this.httpHeaders_ = {
    'X-GF-Version': String(gf.VERSION),
    'X-GF-Server-ID': serverId,
    'X-GF-Server-Key': serverKey
  };
};
goog.inherits(gf.net.browser.BrowserClient, goog.Disposable);


/**
 * Number of seconds between updates to the server browser.
 * An interval should be setup to post new information to the server browser
 * using this frequency. Any longer than this value and a server may be dropped
 * from the browser.
 * @const
 * @type {number}
 */
gf.net.browser.BrowserClient.UPDATE_FREQUENCY = 5;


/**
 * Registers a server with the browser.
 * If the server has already been registered its information will be updated.
 *
 * @param {!gf.net.ServerInfo} serverInfo Server information.
 * @return {!goog.async.Deferred} A deferred fulfilled when the server has been
 *     registered with the browser.
 */
gf.net.browser.BrowserClient.prototype.registerServer = function(serverInfo) {
  var properties = [];
  for (var key in serverInfo.properties) {
    properties.push(key + '=' + serverInfo.properties[key]);
  }
  var content = goog.json.serialize({
    'endpoint': serverInfo.endpoint,
    'server_name': serverInfo.name,
    'server_location': serverInfo.location,
    'game_type': serverInfo.gameType,
    'game_version': serverInfo.gameVersion,
    'game_properties': properties,
    'user_max': serverInfo.maximumUsers
  });
  return gf.net.http.issueRequest(
      'PUT', this.serverUrl_, content, this.httpHeaders_);
};


/**
 * Unregisters a server from the browser.
 * All information about the server and its state will be removed. Only do this
 * when removing a server from active use.
 *
 * @return {!goog.async.Deferred} A deferred fulfilled when the server has been
 *     unregistered from the browser.
 */
gf.net.browser.BrowserClient.prototype.unregisterServer = function() {
  return gf.net.http.issueRequest(
      'DELETE', this.serverUrl_, undefined, this.httpHeaders_);
};


/**
 * Updates runtime server state with the browser.
 * This should be called frequently, usually on an interval using
 * {@see gf.net.browser.BrowserClient.UPDATE_FREQUENCY}, or when significant state changes
 * (such as user join/leave).
 *
 * @param {!Array.<!gf.net.UserInfo>} userInfos Currently active users.
 * @return {!goog.async.Deferred} A deferred fulfilled when the server has been
 *     updated with the browser.
 */
gf.net.browser.BrowserClient.prototype.updateServer = function(userInfos) {
  var userObjects = [];
  for (var n = 0; n < userInfos.length; n++) {
    var userInfo = userInfos[n];
    userObjects.push({
      'display_name': userInfo.displayName
    });
  }
  var content = goog.json.serialize({
    'user_count': userObjects.length,
    'users': userObjects
  });
  return gf.net.http.issueRequest(
      'POST', this.serverUrl_, content, this.httpHeaders_);
};
