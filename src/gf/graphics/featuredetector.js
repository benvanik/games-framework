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
 * @fileoverview Utilities and constants for graphics formats.
 * This should be initialized ASAP and before any queries are performed.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.graphics.FeatureDetector');

goog.require('gf.graphics.ExtensionName');
goog.require('gf.util.FeatureDetector');
goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');
goog.require('goog.dom.TagName');



/**
 * A feature detector used to determine the graphics formats supported by
 * the current environment.
 *
 * @constructor
 * @extends {gf.util.FeatureDetector}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 */
gf.graphics.FeatureDetector = function(graphicsContext) {
  goog.base(this);

  /**
   * Graphics context.
   * @private
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext_ = graphicsContext;

  /**
   * Whether the current client supports WebP files.
   * @type {boolean}
   */
  this.supportsWebP = false;

  /**
   * Whether the current client supports S3TC compressed textures.
   * @type {boolean}
   */
  this.supportsS3TC = false;
};
goog.inherits(gf.graphics.FeatureDetector, gf.util.FeatureDetector);


/**
 * @override
 */
gf.graphics.FeatureDetector.prototype.detectInternal = function() {
  var deferreds = [];
  deferreds.push(this.detectWebP_());
  this.detectS3TC_();
  return new goog.async.DeferredList(deferreds);
};


/**
 * Detects whether the current client supports WebP files.
 * @private
 * @return {!goog.async.Deferred} A deferred fulfilled when detection has
 *     completed.
 */
gf.graphics.FeatureDetector.prototype.detectWebP_ = function() {
  var dom = this.graphicsContext_.dom;

  var img = /** @type {HTMLImageElement} */ (
      dom.createElement(goog.dom.TagName.IMG));
  if (!img) {
    this.supportsWebP = false;
    return goog.async.Deferred.succeed(null);
  }

  var deferred = new goog.async.Deferred();

  var loadCompleted = goog.bind(function() {
    this.supportsWebP = img.height == 2;
    img.onload = null;
    img.onerror = null;
    deferred.callback(null);
  }, this);

  img.addEventListener('load', loadCompleted, false);
  img.addEventListener('error', loadCompleted, false);

  // 2x2 test WebP file from http://webpjs.appspot.com
  img.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0' +
      'iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';

  return deferred;
};


/**
 * Detects whether S3TC compressed textures are supported.
 * @private
 */
gf.graphics.FeatureDetector.prototype.detectS3TC_ =
    function() {
  this.supportsS3TC = this.graphicsContext_.extensions.isSupported(
      gf.graphics.ExtensionName.WEBGL_compressed_texture_s3tc);
};
