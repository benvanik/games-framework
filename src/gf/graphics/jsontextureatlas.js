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

goog.provide('gf.graphics.JsonTextureAtlas');

goog.require('gf.assets.ContentLoader');
goog.require('gf.assets.Observer');
goog.require('gf.graphics.ImageInfo');
goog.require('gf.graphics.TextureAtlas');
goog.require('gf.log');
goog.require('goog.asserts');



/**
 * Texture atlas sourced from a JSON metadata file.
 *
 * @constructor
 * @implements {gf.assets.Observer}
 * @extends {gf.graphics.TextureAtlas}
 * @param {!gf.Runtime} runtime Current runtime.
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {string} path Path to the texture metadata.
 * @param {string} name Human-readable name for debugging.
 */
gf.graphics.JsonTextureAtlas = function(runtime, assetManager, graphicsContext,
    path, name) {
  var lastSlash = path.lastIndexOf('/');
  var basePath = lastSlash >= 0 ? path.substr(0, lastSlash) : '';
  goog.base(this, assetManager, graphicsContext, basePath, name);

  /**
   * Runtime that the component is currently registered in.
   * @type {!gf.Runtime}
   */
  this.runtime = runtime;

  /**
   * Path to the JSON metadata file.
   * @private
   * @type {string}
   */
  this.jsonPath_ = path;

  /**
   * A deferred used for loading.
   * @private
   * @type {goog.async.Deferred}
   */
  this.jsonLoadingDeferred_ = null;

  // Observe changes
  if (this.runtime.buildClient) {
    this.runtime.buildClient.addObserver(this);
  }
};
goog.inherits(gf.graphics.JsonTextureAtlas, gf.graphics.TextureAtlas);


/**
 * @override
 */
gf.graphics.JsonTextureAtlas.prototype.disposeInternal = function() {
  // Stop observing
  if (this.runtime.buildClient) {
    this.runtime.buildClient.removeObserver(this);
  }

  if (this.jsonLoadingDeferred_) {
    this.jsonLoadingDeferred_.cancel();
    this.jsonLoadingDeferred_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * @override
 */
gf.graphics.JsonTextureAtlas.prototype.notifyAssetsChanged = function(tags) {
  for (var n = 0; n < tags.length; n++) {
    if (tags[n] == this.jsonPath_) {
      gf.log.write('TextureAtlas ' + this.name + ' modified, reloading...');
      this.load();
      break;
    }
  }
};


/**
 * @override
 */
gf.graphics.JsonTextureAtlas.prototype.load = function() {
  this.beginLoadingMetadata_(this.jsonPath_);
};


/**
 * Starts loading the texture metadata.
 * @private
 * @param {string} path JSON metadata path.
 */
gf.graphics.JsonTextureAtlas.prototype.beginLoadingMetadata_ = function(path) {
  var assetLoader = new gf.assets.ContentLoader(
      this.jsonPath_, gf.assets.ContentLoader.Type.JSON);
  this.jsonLoadingDeferred_ = this.assetManager.load(assetLoader);
  this.jsonLoadingDeferred_.addCallbacks(
      this.handleJsonLoad_, this.handleError, this);
};


/**
 * Handles successful metadata load events.
 * @private
 * @param {!Object} content Content.
 */
gf.graphics.JsonTextureAtlas.prototype.handleJsonLoad_ = function(content) {
  this.jsonLoadingDeferred_ = null;

  var imageInfo = gf.graphics.ImageInfo.loadFromJson(content['imageInfo']);
  this.setImageInfo(imageInfo);

  if (content['format'] == 'square') {
    var slotSize = Number(content['slotSize']);
    this.setupSquareSlots(slotSize);
  } else if (content['format'] == 'list') {
    var slotList = content['slotList'];
    goog.asserts.fail('not yet implemented');
  }

  this.beginLoadingData();
};


/**
 * @override
 */
gf.graphics.JsonTextureAtlas.prototype.handleError = function(arg) {
  this.jsonLoadingDeferred_ = null;

  goog.base(this, 'handleError', arg);
};
