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

goog.provide('gf.net.http.XhrHttpRequest');

goog.require('gf.net.http.HttpRequest');
goog.require('gf.net.http.HttpResponse');
goog.require('goog.async.Deferred');
goog.require('goog.events');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');



/**
 * XMLHttpRequest HTTP network request.
 * @constructor
 * @extends {gf.net.http.HttpRequest}
 * @param {string} method HTTP method.
 * @param {string} url Full URL.
 * @param {string=} opt_content Body of the PUT/POST.
 * @param {Object.<string>=} opt_headers Additional HTTP headers.
 */
gf.net.http.XhrHttpRequest = function(method, url, opt_content, opt_headers) {
  goog.base(this, method, url, opt_content, opt_headers);
};
goog.inherits(gf.net.http.XhrHttpRequest, gf.net.http.HttpRequest);


/**
 * @override
 */
gf.net.http.XhrHttpRequest.prototype.issue = function() {
  var deferred = new goog.async.Deferred();

  var xhr = new goog.net.XhrIo();
  xhr.setTimeoutInterval(gf.net.http.HttpRequest.TIMEOUT);

  var key = goog.events.listen(xhr, goog.net.EventType.COMPLETE,
      function() {
        var response = new gf.net.http.HttpResponse(
            xhr.getStatus(), xhr.getResponseText());
        goog.events.unlistenByKey(key);
        goog.dispose(xhr);
        if (xhr.isSuccess()) {
          deferred.callback(response);
        } else {
          deferred.errback(response);
        }
      });

  xhr.send(this.url, this.method, this.content, this.headers);

  return deferred;
};
