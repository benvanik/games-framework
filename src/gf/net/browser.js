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

goog.provide('gf.net.Browser');

goog.require('gf');
goog.require('goog.Disposable');
goog.require('goog.async.Deferred');
goog.require('goog.events');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIoPool');
goog.require('goog.structs.Map');



/**
 * Server browser client.
 * Can be used client-side to discover servers or by servers to register and
 * maintain their status in the database.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} baseUrl Base browser HTTP endpoint with a trailing slash.
 */
gf.net.Browser = function(serverId, serverKey, baseUrl) {
  goog.base(this);

  /**
   * Base browser HTTP endpoint.
   * @private
   * @type {string}
   */
  this.baseUrl_ = baseUrl;

  // Add some additional headers, for fun
  var headers = new goog.structs.Map();
  headers.set('X-GF-Version', String(gf.VERSION));

  /**
   * XHR pool used for making all requests to the browser.
   * @private
   * @type {!goog.net.XhrIoPool}
   */
  this.xhrPool_ = new goog.net.XhrIoPool(headers);
  this.registerDisposable(this.xhrPool_);
};
goog.inherits(gf.net.Browser, goog.Disposable);


/**
 * Number of seconds between updates to the server browser.
 * An interval should be setup to post new information to the server browser
 * using this frequency. Any longer than this value and a server may be dropped
 * from the browser.
 * @const
 * @type {number}
 */
gf.net.Browser.UPDATE_FREQUENCY = 5;


/**
 * Timeout interval, in ms, for XHRs.
 * @private
 * @const
 * @type {number}
 */
gf.net.Browser.TIMEOUT_ = 20 * 1000;


/**
 * Issues an XHR request as either a GET or POST.
 * @param {string} method HTTP method, either GET or POST.
 * @param {string} url URI to make the request at.
 * @param {string=} opt_content Body for POST requests.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes. Callbacks and errbacks receive (statusCode, contents).
 */
gf.net.Browser.prototype.issue_ = function(method, url, opt_content) {
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

        xhr.setTimeoutInterval(gf.net.Browser.TIMEOUT_);
        xhr.send(url, method, opt_content);
      });
  return deferred;
};


/**
 * Registers a server with the browser.
 * If the server has already been registered its information will be updated.
 *
 * @param {string} serverId Server UUID.
 * @param {string} serverKey Server key used for verification.
 * @param {!gf.net.ServerInfo} serverInfo Server information.
 * @return {!goog.async.Deferred} A deferred fulfilled when the server has been
 *     registered with the browser.
 */
gf.net.Browser.prototype.registerServer = function(
    serverId, serverKey, serverInfo) {
  var url = this.baseUrl_ + 'server/' + serverId;

};


/**
 * Unregisters a server from the browser.
 * All information about the server and its state will be removed. Only do this
 * when removing a server from active use.
 *
 * @param {string} serverId Server UUID.
 * @param {string} serverKey Server key used for verification.
 * @return {!goog.async.Deferred} A deferred fulfilled when the server has been
 *     unregistered from the browser.
 */
gf.net.Browser.prototype.unregisterServer = function(
    serverId, serverKey) {
  // TODO(benvanik): unregisterServer
};


/**
 * Updates runtime server state with the browser.
 * This should be called frequently, usually on an interval using
 * {@see gf.net.Browser.UPDATE_FREQUENCY}, or when significant state changes
 * (such as user join/leave).
 *
 * @param {string} serverId Server UUID.
 * @param {string} serverKey Server key used for verification.
 * @param {!Array.<!gf.net.UserInfo>} userInfos Currently active users.
 * @return {!goog.async.Deferred} A deferred fulfilled when the server has been
 *     updated with the browser.
 */
gf.net.Browser.prototype.updateServer = function(
    serverId, serverKey, userInfos) {
  // TODO(benvanik): updateServer
};


/**
 *
 */
gf.net.Browser.prototype.query = function() {
  // TODO(benvanik): query
  // query args:
  // - game type
  // - game version
  // - has friends
  // - has users / not full
  // - location
  // - custom properties
};
