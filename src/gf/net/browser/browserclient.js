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
goog.require('goog.Disposable');
goog.require('goog.async.Deferred');
goog.require('goog.events');
goog.require('goog.json');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIoPool');
goog.require('goog.structs.Map');



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

  // Add some additional headers, for fun
  var headers = new goog.structs.Map();
  headers.set('X-GF-Version', String(gf.VERSION));
  headers.set('X-GF-Server-ID', serverId);
  headers.set('X-GF-Server-Key', serverKey);

  /**
   * XHR pool used for making all requests to the browser.
   * @private
   * @type {!goog.net.XhrIoPool}
   */
  this.xhrPool_ = new goog.net.XhrIoPool(headers);
  this.registerDisposable(this.xhrPool_);
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
 * Timeout interval, in ms, for XHRs.
 * @private
 * @const
 * @type {number}
 */
gf.net.browser.BrowserClient.TIMEOUT_ = 20 * 1000;


/**
 * Issues an XHR request as either a GET or POST.
 * @param {string} method HTTP method, either GET or POST.
 * @param {string} url URI to make the request at.
 * @param {string=} opt_content Body for POST requests.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes. Callbacks and errbacks receive (statusCode, contents).
 */
gf.net.browser.BrowserClient.prototype.issue_ =
    function(method, url, opt_content) {
  var deferred = new goog.async.Deferred();
  var pool = this.xhrPool_;
  pool.getObject(
      /**
       * @param {!goog.net.XhrIo} xhr
       */
      function(xhr) {
        var key = goog.events.listen(xhr, goog.net.EventType.COMPLETE,
            function() {
              var result = [xhr.getStatus(), xhr.getResponseText()];
              if (xhr.isSuccess()) {
                deferred.callback(result);
              } else {
                deferred.errback(result);
              }

              goog.events.unlistenByKey(key);
              pool.releaseObject(xhr);
            });

        xhr.setTimeoutInterval(gf.net.browser.BrowserClient.TIMEOUT_);
        xhr.send(url, method, opt_content);
      });
  return deferred;
};


/**
 * Registers a server with the browser.
 * If the server has already been registered its information will be updated.
 *
 * @param {!gf.net.ServerInfo} serverInfo Server information.
 * @return {!goog.async.Deferred} A deferred fulfilled when the server has been
 *     registered with the browser.
 */
gf.net.browser.BrowserClient.prototype.registerServer = function(serverInfo) {
  var content = goog.json.serialize({
    'endpoint': serverInfo.endpoint,
    'server_name': serverInfo.name,
    'server_location': serverInfo.location,
    'game_type': serverInfo.gameType,
    'game_version': serverInfo.gameVersion,
    'game_properties': serverInfo.properties,
    'user_max': serverInfo.maximumUsers
  });
  return this.issue_('PUT', this.serverUrl_, content);
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
  return this.issue_('DELETE', this.serverUrl_);
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
  return this.issue_('POST', this.serverUrl_, content);
};
