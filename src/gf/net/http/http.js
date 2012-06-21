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

goog.provide('gf.net.http');

goog.require('gf');
goog.require('gf.net.http.NodeHttpRequest');
goog.require('gf.net.http.XhrHttpRequest');


/**
 * Asynchronously issues a new HTTP request.
 * @param {string} method HTTP method.
 * @param {string} url Full URL.
 * @param {string=} opt_content Body of the PUT/POST.
 * @param {Object.<string>=} opt_headers Additional HTTP headers.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes. Callbacks receive a {@see gf.net.http.HttpResponse} as
 *     their only argument.
 */
gf.net.http.issueRequest = function(method, url, opt_content, opt_headers) {
  var request;
  if (gf.NODE) {
    request = new gf.net.http.NodeHttpRequest(
        method, url, opt_content, opt_headers);
  } else {
    request = new gf.net.http.XhrHttpRequest(
        method, url, opt_content, opt_headers);
  }
  return request.issue();
};
