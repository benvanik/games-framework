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

goog.provide('gf.net.browser');
goog.provide('gf.net.browser.QueryResult');

goog.require('gf');
goog.require('gf.net.ServerInfo');
goog.require('goog.async.Deferred');
goog.require('goog.events');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.structs.Map');



/**
 * A single query result.
 * @constructor
 * @param {string} endpoint Server endpoint.
 * @param {!gf.net.ServerInfo} serverInfo Server information.
 */
gf.net.browser.QueryResult = function(endpoint, serverInfo) {
  /**
   * Server endpoint.
   * @type {string}
   */
  this.endpoint = endpoint;

  /**
   * Server information.
   * @type {!gf.net.ServerInfo}
   */
  this.serverInfo = serverInfo;

  // TODO(benvanik): user info/etc
};


/**
 * Queries the server browser for servers.
 *
 * @param {string} baseUrl Base browser HTTP endpoint with a trailing slash.
 * @return {!goog.async.Deferred} A deferred fulfilled when the query completes.
 *     Successful callbacks receive a list of {@see gf.net.browser.QueryResult},
 *     errbacks will receive the HTTP status code or an exception.
 */
gf.net.browser.query = function(baseUrl) {
  // query args:
  // - game type
  // - game version
  // - has friends
  // - has users / not full
  // - location
  // - custom properties

  var deferred = new goog.async.Deferred();

  // TODO(benvanik): query for real - right now it's all faked
  var url = baseUrl;

  var xhr = new goog.net.XhrIo();
  xhr.setTimeoutInterval(gf.net.browser.QUERY_TIMEOUT_);

  var key = goog.events.listen(xhr, goog.net.EventType.COMPLETE,
      function() {
        goog.events.unlistenByKey(key);
        goog.dispose(xhr);
        if (xhr.isSuccess()) {
          var results;
          try {
            results = gf.net.browser.parseQueryResults_(xhr.getResponseJson());
          } catch (e) {
            deferred.errback(e);
          }
          if (results) {
            deferred.callback(results);
          }
        } else {
          deferred.errback(xhr.getStatus());
        }
      });

  var headers = new goog.structs.Map();
  headers.set('X-GF-Version', String(gf.VERSION));
  xhr.send(url, undefined, undefined, headers);

  return deferred;
};


/**
 * Parses the query results JSON blob.
 * @private
 * @param {Object} json JSON object, if it could be parsed.
 */
gf.net.browser.parseQueryResults_ = function(json) {
  if (!json || !goog.isArray(json)) {
    throw 'No response/invalid data';
  }
  // Expected format:
  /*
  [
    {
      'endpoint': 'ws://...',
      'serverInfo': {...}
      },
      ...
  ]
  */
  var results = [];
  for (var n = 0; n < json.length; n++) {
    var jsonResult = json[n];
    var endpoint = jsonResult['endpoint'];
    if (!endpoint || !goog.isString(endpoint)) {
      throw 'Invalid data';
    }
    var jsonServerInfo = jsonResult['serverInfo'];
    var serverInfo = gf.net.ServerInfo.fromJson(jsonResult['serverInfo']);
    if (!serverInfo) {
      throw 'Invalid data';
    }
    results.push(new gf.net.browser.QueryResult(endpoint, serverInfo));
  }
  return results;
};


/**
 * Timeout, in ms, for query requests.
 * @private
 * @const
 * @type {number}
 */
gf.net.browser.QUERY_TIMEOUT_ = 20 * 1000;
