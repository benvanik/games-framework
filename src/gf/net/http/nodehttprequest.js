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

goog.provide('gf.net.http.NodeHttpRequest');

goog.require('gf.net.http.HttpRequest');



/**
 * Node.js HTTP network request.
 * @constructor
 * @extends {gf.net.http.HttpRequest}
 * @param {string} method HTTP method.
 * @param {string} url Full URL.
 * @param {string=} opt_content Body of the PUT/POST.
 * @param {Object.<string>=} opt_headers Additional HTTP headers.
 */
gf.net.http.NodeHttpRequest = function(method, url, opt_content, opt_headers) {
  goog.base(this, method, url, opt_content, opt_headers);
};
goog.inherits(gf.net.http.NodeHttpRequest, gf.net.http.HttpRequest);


/**
 * @override
 */
gf.net.http.NodeHttpRequest.prototype.issue = function() {
  var deferred = new goog.async.Deferred();

  var url = /** @type {!UrlModule} */ (require('url'));
  var http = /** @type {!HttpModule} */ (require('http'));

  var content = this.content ? new Buffer(this.content, 'utf8') : null;

  var options = url.parse(this.url);
  options['method'] = this.method;
  options['headers'] = this.headers;
  if (content) {
    options['headers']['Content-length'] = content.length;
  }

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');

    var content = null;
    res.addListener('data', function(chunk) {
      content = (content ? content : '') + chunk;
    });
    res.addListener('end', function() {
      var response = new gf.net.http.HttpResponse(res.statusCode, content);
      if (response.statusCode == 200) {
        deferred.callback(response);
      } else {
        deferred.errback(response);
      }
    });
  });
  req.setTimeout(gf.net.http.HttpRequest.TIMEOUT);
  req.addListener('error', function(e) {
    deferred.errback(e);
  });
  req.end(content);

  return deferred;
};
