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

goog.provide('gf.net.http.HttpRequest');

goog.require('goog.Disposable');
goog.require('goog.object');



/**
 * Abstract simple HTTP network request.
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} method HTTP method.
 * @param {string} url Full URL.
 * @param {string=} opt_content Body of the PUT/POST.
 * @param {Object.<string>=} opt_headers Additional HTTP headers.
 */
gf.net.http.HttpRequest = function(
    method, url, opt_content, opt_headers) {
  goog.base(this);

  /**
   * HTTP method (PUT/GET/etc).
   * @type {string}
   */
  this.method = method;

  /**
   * Full URL.
   * @type {string}
   */
  this.url = url;

  /**
   * Body of the PUT/POST.
   * @type {?string}
   */
  this.content = opt_content || null;

  /**
   * Additional HTTP headers.
   * @type {!Object.<string>}
   */
  this.headers = opt_headers ? goog.object.clone(opt_headers) : {};
};
goog.inherits(gf.net.http.HttpRequest, goog.Disposable);


/**
 * Timeout interval, in ms, for requests.
 * @const
 * @type {number}
 */
gf.net.http.HttpRequest.TIMEOUT = 20 * 1000;


/**
 * Issues the network request.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request has
 *     been issued. Successful callbacks will receive a
 *     {@see gf.net.http.HttpResponse}.
 */
gf.net.http.HttpRequest.prototype.issue = goog.abstractMethod;
