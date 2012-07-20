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
goog.require('gf.net.http');
goog.require('gf.net.http.HttpResonse');
goog.require('goog.async.Deferred');
goog.require('goog.json');



/**
 * A single query result.
 * @constructor
 * @param {!gf.net.ServerInfo} serverInfo Server information.
 */
gf.net.browser.QueryResult = function(serverInfo) {
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

  // TODO(benvanik): query for real - right now it's all faked
  var url = baseUrl;

  var deferred = new goog.async.Deferred();
  gf.net.http.issueRequest('GET', url, undefined, {
    'X-GF-Version': String(gf.VERSION)
  }).addCallbacks(
      /**
       * @param {!gf.net.http.HttpResponse} response HTTP response.
       */
      function(response) {
        var result = null;
        try {
          var json = goog.json.parse(response.content);
          result = gf.net.browser.parseQueryResults_(json);
        } catch (e) {
          deferred.errback(e);
        }
        deferred.callback(result);
      },
      /**
       * @param {!gf.net.http.HttpResponse|*} arg Error argument.
       */
      function(arg) {
        if (arg instanceof gf.net.http.HttpResonse) {
          deferred.errback(arg.statusCode);
        } else {
          deferred.errback(arg);
        }
      });
  return deferred;
};


/**
 * Parses the query results JSON blob.
 * @private
 * @param {Object} json JSON object, if it could be parsed.
 * @return {!Array.<!gf.net.browser.QueryResult>} Results.
 */
gf.net.browser.parseQueryResults_ = function(json) {
  if (!json || !goog.isArray(json)) {
    throw 'No response/invalid data';
  }
  // Expected format:
  /*
  [
    {
      'server_info': {...}
      },
      ...
  ]
  */
  var results = [];
  for (var n = 0; n < json.length; n++) {
    var jsonResult = json[n];
    var jsonServerInfo = jsonResult['server_info'];
    var serverInfo = gf.net.ServerInfo.fromJson(jsonResult['server_info']);
    if (!serverInfo) {
      throw 'Invalid data';
    }
    results.push(new gf.net.browser.QueryResult(serverInfo));
  }
  return results;
};
