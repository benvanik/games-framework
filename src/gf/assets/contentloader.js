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

/**
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.assets.ContentLoader');

goog.require('gf.assets.AssetLoader');
goog.require('goog.asserts');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');



/**
 * JSON/ArrayBuffer/etc asset loader.
 *
 * @constructor
 * @extends {gf.assets.AssetLoader}
 * @param {string} url Asset URL.
 * @param {gf.assets.ContentLoader.Type} contentType Content type.
 * @param {number=} opt_timeout Timeout interval, in ms, or 0 to disable.
 */
gf.assets.ContentLoader = function(url, contentType, opt_timeout) {
  goog.base(this);

  /**
   * Asset URL.
   * @type {string}
   */
  this.url = url;

  /**
   * Content type.
   * @type {gf.assets.ContentLoader.Type}
   */
  this.contentType = contentType;

  /**
   * Timeout interval, in ms, or 0 to disable.
   * @type {number}
   */
  this.timeout = opt_timeout || 0;

  /**
   * The XHR transaction, if loading.
   * @private
   * @type {goog.net.XhrIo}
   */
  this.xhrIo_ = null;

  /**
   * A deferred waiting for the content load.
   * @private
   * @type {goog.async.Deferred}
   */
  this.loadingDeferred_ = null;
};
goog.inherits(gf.assets.ContentLoader, gf.assets.AssetLoader);


/**
 * Content type.
 * @enum {number}
 */
gf.assets.ContentLoader.Type = {
  /**
   * String.
   */
  STRING: 0,

  /**
   * Parsed JSON object.
   */
  JSON: 1,

  /**
   * Typed array.
   */
  ARRAY_BUFFER: 2,

  /**
   * Blob, useful for large pieces of content.
   */
  BLOB: 3
};


/**
 * @override
 */
gf.assets.ContentLoader.prototype.load = function(deferred) {
  goog.asserts.assert(!this.loadingDeferred_);
  goog.asserts.assert(!this.xhrIo_);

  this.loadingDeferred_ = deferred;

  this.xhrIo_ = new goog.net.XhrIo();
  this.registerDisposable(this.xhrIo_);
  this.xhrIo_.setTimeoutInterval(this.timeout);

  switch (this.contentType) {
    default:
    case gf.assets.ContentLoader.Type.STRING:
    case gf.assets.ContentLoader.Type.JSON:
      this.xhrIo_.setResponseType(goog.net.XhrIo.ResponseType.DEFAULT);
      break;
    case gf.assets.ContentLoader.Type.ARRAY_BUFFER:
      this.xhrIo_.setResponseType(goog.net.XhrIo.ResponseType.ARRAY_BUFFER);
      break;
    case gf.assets.ContentLoader.Type.BLOB:
      this.xhrIo_.setResponseType(goog.net.XhrIo.ResponseType.BLOB);
      break;
  }

  // Listen for events
  this.eh.listen(this.xhrIo_,
      goog.net.EventType.SUCCESS,
      this.handleLoad_);
  this.eh.listen(this.xhrIo_, [
    goog.net.EventType.ABORT,
    goog.net.EventType.ERROR,
    goog.net.EventType.TIMEOUT
  ], this.handleError_);

  // Start loading now
  this.xhrIo_.send(this.url);
};


/**
 * @override
 */
gf.assets.ContentLoader.prototype.cancel = function() {
  if (this.xhrIo_) {
    this.xhrIo_.abort();
  }
};


/**
 * Handles successful image load events.
 * @private
 * @param {!goog.events.Event} e Network event.
 */
gf.assets.ContentLoader.prototype.handleLoad_ = function(e) {
  var content;
  switch (this.contentType) {
    default:
    case gf.assets.ContentLoader.Type.STRING:
      content = this.xhrIo_.getResponseText();
      break;
    case gf.assets.ContentLoader.Type.JSON:
      content = this.xhrIo_.getResponseJson();
      break;
    case gf.assets.ContentLoader.Type.ARRAY_BUFFER:
    case gf.assets.ContentLoader.Type.BLOB:
      content = this.xhrIo_.getResponse();
      break;
  }

  this.loadingDeferred_.callback(content);
  this.loadingDeferred_ = null;
};


/**
 * Handles failed/aborted image load events.
 * @private
 * @param {!goog.events.Event} e Network event.
 */
gf.assets.ContentLoader.prototype.handleError_ = function(e) {
  // TODO(benvanik): pass back error
  switch (e.type) {
    case goog.net.EventType.ABORT:
    case goog.net.EventType.ERROR:
    case goog.net.EventType.TIMEOUT:
      break;
  }

  this.loadingDeferred_.errback(null);
  this.loadingDeferred_ = null;
};
