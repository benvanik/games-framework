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

goog.provide('gf.assets.ImageLoader');

goog.require('gf.assets.AssetLoader');
goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.events.EventType');
goog.require('goog.net.EventType');



/**
 * Image asset loader.
 *
 * @constructor
 * @extends {gf.assets.AssetLoader}
 * @param {!goog.dom.DomHelper} dom DOM.
 * @param {string} url Asset URL.
 * @param {string=} opt_crossOrigin Cross-origin header value.
 */
gf.assets.ImageLoader = function(dom, url, opt_crossOrigin) {
  goog.base(this);

  /**
   * DOM.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom;

  /**
   * Asset URL.
   * @type {string}
   */
  this.url = url;

  /**
   * Cross-origin header value.
   * @type {string?}
   */
  this.crossOrigin = null;

  /**
   * The <img> that is loading the texture, if it is being loaded.
   * @private
   * @type {HTMLImageElement}
   */
  this.loadingImage_ = null;

  /**
   * A deferred waiting for the image load.
   * @private
   * @type {goog.async.Deferred}
   */
  this.loadingDeferred_ = null;
};
goog.inherits(gf.assets.ImageLoader, gf.assets.AssetLoader);


/**
 * @override
 */
gf.assets.ImageLoader.prototype.disposeInternal = function() {
  this.eh.removeAll();

  // May not be alive anymore, but kill it anyway
  if (this.loadingImage_) {
    this.loadingImage_.src = '';
    this.loadingImage_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * @override
 */
gf.assets.ImageLoader.prototype.load = function(deferred) {
  goog.asserts.assert(!this.loadingDeferred_);
  goog.asserts.assert(!this.loadingImage_);

  this.loadingDeferred_ = deferred;

  this.loadingImage_ = /** @type {!HTMLImageElement} */ (
      this.dom.createElement(goog.dom.TagName.IMG));
  if (this.crossOrigin) {
    this.loadingImage_.crossOrigin = this.crossOrigin;
  }

  // Listen for events
  this.eh.listen(this.loadingImage_,
      goog.events.EventType.LOAD,
      this.handleLoad_);
  this.eh.listen(this.loadingImage_, [
    goog.net.EventType.ABORT, goog.net.EventType.ERROR
  ], this.handleError_);

  // Start loading now
  this.loadingImage_.src = this.url;
};


/**
 * @override
 */
gf.assets.ImageLoader.prototype.cancel = function() {
  if (this.loadingImage_) {
    this.eh.removeAll();

    this.loadingImage_.src = '';
    this.loadingImage_ = null;

    // TODO(benvanik): pass back error
    this.loadingDeferred_.errback(null);
    this.loadingDeferred_ = null;
  }
};


/**
 * Handles successful image load events.
 * @private
 * @param {!goog.events.Event} e Network event.
 */
gf.assets.ImageLoader.prototype.handleLoad_ = function(e) {
  var img = this.loadingImage_;
  goog.asserts.assert(img);
  this.loadingImage_ = null;

  this.loadingDeferred_.callback(img);
  this.loadingDeferred_ = null;
};


/**
 * Handles failed/aborted image load events.
 * @private
 * @param {!goog.events.Event} e Network event.
 */
gf.assets.ImageLoader.prototype.handleError_ = function(e) {
  this.loadingImage_ = null;

  // TODO(benvanik): pass back error
  this.loadingDeferred_.errback(null);
  this.loadingDeferred_ = null;
};
