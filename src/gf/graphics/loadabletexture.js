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

goog.provide('gf.graphics.LoadableTexture');

goog.require('gf.assets.ContentLoader');
goog.require('gf.assets.DataSource');
goog.require('gf.assets.ImageLoader');
goog.require('gf.graphics.Texture');
goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.string.path');
goog.require('goog.webgl');



/**
 * A texture that supports deferred loading and multiple levels of detail.
 *
 * @constructor
 * @extends {gf.graphics.Texture}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {string} path Source path base folder.
 * @param {string} name Human-readable name for debugging.
 * @param {gf.graphics.ImageInfo=} opt_imageInfo Image info.
 */
gf.graphics.LoadableTexture = function(assetManager, graphicsContext, path,
    name, opt_imageInfo) {
  goog.base(this,
      graphicsContext,
      opt_imageInfo ? opt_imageInfo.width : 1,
      opt_imageInfo ? opt_imageInfo.height : 1,
      goog.webgl.RGBA);

  /**
   * Asset manager used for loads.
   * @type {!gf.assets.AssetManager}
   */
  this.assetManager = assetManager;

  /**
   * Source path base folder.
   * @type {string}
   */
  this.path = path;

  /**
   * Human-readable name for debugging.
   * @type {string}
   */
  this.name = name;

  /**
   * Image metadata, if loaded.
   * @type {gf.graphics.ImageInfo}
   */
  this.imageInfo = null;

  /**
   * Image format, if one has been selected.
   * @type {gf.graphics.ImageFormat}
   */
  this.imageFormat = null;

  /**
   * Whether the texture is fully loaded.
   * @type {boolean}
   */
  this.isLoaded = false;

  /**
   * A deferred used for loading.
   * @private
   * @type {goog.async.Deferred}
   */
  this.loadingDeferred_ = null;

  if (opt_imageInfo) {
    this.setImageInfo(opt_imageInfo);
  }
};
goog.inherits(gf.graphics.LoadableTexture, gf.graphics.Texture);


/**
 * @override
 */
gf.graphics.LoadableTexture.prototype.disposeInternal = function() {
  if (this.loadingDeferred_) {
    this.loadingDeferred_.cancel();
    this.loadingDeferred_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * @override
 */
gf.graphics.LoadableTexture.prototype.restore = function() {
  goog.base(this, 'restore');

  // If already loading, ignore - we will be fine when it completes
  if (this.loadingDeferred_) {
    return;
  }

  this.load();
};


/**
 * Begins loading the texture.
 */
gf.graphics.LoadableTexture.prototype.load = function() {
  this.beginLoadingData();
};


/**
 * Sets the image info data.
 * @protected
 * @param {!gf.graphics.ImageInfo} imageInfo New image info.
 */
gf.graphics.LoadableTexture.prototype.setImageInfo = function(imageInfo) {
  this.imageInfo = imageInfo;
  this.width = imageInfo.width;
  this.height = imageInfo.height;
  for (var n = 0; n < this.imageInfo.levelsOfDetail.length; n++) {
    // TODO(benvanik): another sorting algo? compressed first?
    gf.assets.DataSource.sortBySize(this.imageInfo.levelsOfDetail[n]);
  }
};


/**
 * Starts loading the image data.
 * @protected
 */
gf.graphics.LoadableTexture.prototype.beginLoadingData = function() {
  var dom = this.assetManager.dom;
  goog.asserts.assert(dom);

  // Find the best data source
  // TODO(benvanik): pick LOD
  var lod = 0;
  var dataSource = this.imageInfo.getBestDataSource(this.graphicsContext, lod);
  if (!dataSource) {
    // No supported data source found
    // TODO(benvanik): log
    return;
  }
  var imageFormat = this.imageInfo.getFormatFromDataSource(dataSource);
  if (!imageFormat) {
    // Unsupported format/invalid
    // TODO(benvanik): log
    return;
  }

  this.imageFormat = imageFormat;

  var url = goog.string.path.join(this.path, dataSource.path);
  var assetLoader = null;
  if (imageFormat.shouldLoadAsRawData()) {
    assetLoader = new gf.assets.ContentLoader(
        url,
        gf.assets.ContentLoader.Type.ARRAY_BUFFER);
  } else {
    assetLoader = new gf.assets.ImageLoader(
        dom, url);
  }
  goog.asserts.assert(assetLoader);
  this.loadingDeferred_ = this.assetManager.load(assetLoader);
  this.loadingDeferred_.addCallbacks(this.handleLoad_, this.handleError, this);
};


/**
 * Handles successful asset load events.
 * @private
 * @param {!(HTMLImageElement|ArrayBufferView)} content Content.
 */
gf.graphics.LoadableTexture.prototype.handleLoad_ = function(content) {
  this.loadingDeferred_ = null;

  this.uploadTexture_(content);
};


/**
 * Handles failed/aborted asset load events.
 * @protected
 * @param {Object} arg Error info.
 */
gf.graphics.LoadableTexture.prototype.handleError = function(arg) {
  this.loadingDeferred_ = null;

  var canvas = /** @type {!HTMLCanvasElement} */ (
      this.graphicsContext.dom.createElement(goog.dom.TagName.CANVAS));
  canvas.width = 16;
  canvas.height = 16;

  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(255,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  this.uploadTexture_(canvas);
};


/**
 * Uploads the atlas texture from the source.
 * @private
 * @param {!(HTMLImageElement|HTMLCanvasElement|ArrayBufferView)} data Source
 *     content.
 */
gf.graphics.LoadableTexture.prototype.uploadTexture_ = function(data) {
  var gl = this.graphicsContext.gl;

  // Bind the texture for upload
  this.graphicsContext.setTexture(0, this);

  this.handle.displayName = this.name;

  // Pixel store params, if needed
  //gl.pixelStorei(goog.webgl.UNPACK_ALIGNMENT, 4);
  //gl.pixelStorei(goog.webgl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
  //    goog.webgl.BROWSER_DEFAULT_WEBGL);
  //gl.pixelStorei(goog.webgl.UNPACK_FLIP_Y_WEBGL, 0);
  //gl.pixelStorei(goog.webgl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

  var width = this.width;
  var height = this.height;
  // TODO(benvanik): scale by LOD level? >> LOD

  // Upload
  var imageFormat = this.imageFormat;
  goog.asserts.assert(imageFormat);
  if (data instanceof HTMLCanvasElement ||
      data instanceof HTMLImageElement) {
    gl.texImage2D(
        goog.webgl.TEXTURE_2D,
        0,
        imageFormat.webglFormat,
        imageFormat.webglFormat,
        goog.webgl.UNSIGNED_BYTE,
        data);
  } else if (data instanceof ArrayBuffer) {
    switch (imageFormat.webglFormat) {
      default:
        gl.texImage2D(
            goog.webgl.TEXTURE_2D,
            0,
            imageFormat.webglFormat,
            width, height,
            0,
            imageFormat.webglFormat,
            goog.webgl.UNSIGNED_BYTE,
            data);
        break;
      case goog.webgl.COMPRESSED_RGB_S3TC_DXT1_EXT:
      case goog.webgl.COMPRESSED_RGBA_S3TC_DXT1_EXT:
      case goog.webgl.COMPRESSED_RGBA_S3TC_DXT3_EXT:
      case goog.webgl.COMPRESSED_RGBA_S3TC_DXT5_EXT:
        gl.compressedTexImage2D(
            goog.webgl.TEXTURE_2D,
            0,
            imageFormat.webglFormat,
            width, height,
            0,
            data);
        break;
    }
  } else {
    // Unknown/unsupported type
    goog.asserts.fail('Unsupported texture data type');
  }

  // Generate mipmaps, if required
  //gl.generateMipmap(goog.webgl.TEXTURE_2D);

  this.isLoaded = true;
};
