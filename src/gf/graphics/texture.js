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

goog.provide('gf.graphics.Texture');

goog.require('gf.graphics.ExtensionName');
goog.require('gf.graphics.Resource');
goog.require('goog.asserts');
goog.require('goog.vec.Vec4');
goog.require('goog.webgl');



/**
 * Base texture type.
 *
 * TODO(benvanik): mipmap settings
 * TODO(benvanik): clone
 * TODO(benvanik): clear
 * TODO(benvanik): render target/etc
 *
 * @constructor
 * @extends {gf.graphics.Resource}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {number} width Texture width, in pixels.
 * @param {number} height Texture height, in pixels.
 * @param {number} format Texture format (one of RGB/RGBA/etc).
 */
gf.graphics.Texture = function(graphicsContext, width, height, format) {
  goog.base(this, graphicsContext);

  /**
   * Width, in px. 1 until the texture is loaded.
   * @type {number}
   */
  this.width = width;

  /**
   * Height, in px. 1 until the texture is loaded.
   * @type {number}
   */
  this.height = height;

  /**
   * WebGL texture format, of type RGB/RGBA/etc.
   * The value of this may vary greatly due to compressed texture formats/etc.
   * @type {number}
   */
  this.format = format;

  /**
   * A bitmask of values from {@see gf.graphics.Texture.DirtyFlags_} indicating
   * which state values are dirty and need to be set on the next bind.
   * @private
   * @type {number}
   */
  this.dirtyFlags_ = 0;

  /**
   * Current texture filtering minification mode.
   * @private
   * @type {number}
   */
  this.minFilter_ = goog.webgl.NEAREST_MIPMAP_LINEAR;

  /**
   * Current texture filtering magnification mode.
   * @private
   * @type {number}
   */
  this.magFilter_ = goog.webgl.LINEAR;

  /**
   * Current texture wrapping mode on S.
   * @private
   * @type {number}
   */
  this.wrapS_ = goog.webgl.REPEAT;

  /**
   * Current texture wrapping mode on T.
   * @private
   * @type {number}
   */
  this.wrapT_ = goog.webgl.REPEAT;

  /**
   * Current anisotropic filtering value.
   * @private
   * @type {number}
   */
  this.maxAnisotropy_ = 1;

  /**
   * Slot texture coordinates, indexed by slot index.
   * Only initialized if slots have been setup.
   * @private
   * @type {Array.<!goog.vec.Vec4.Type>}
   */
  this.slots_ = null;

  /**
   * WebGL texture resource.
   * May be null if not yet loaded or discarded.
   * @type {WebGLTexture}
   */
  this.handle = null;
};
goog.inherits(gf.graphics.Texture, gf.graphics.Resource);


/**
 * Bitmask indicating whether a value is dirty and needs to be reset on
 * the next bind operation.
 * @private
 * @enum {number}
 */
gf.graphics.Texture.DirtyFlags_ = {
  MIN_FILTER: 1 << 0,
  MAG_FILTER: 1 << 1,
  WRAP_S: 1 << 2,
  WRAP_T: 1 << 3,
  MAX_ANISOTROPY: 1 << 4,

  ALL: 0xFFFFFFFF
};


/**
 * @override
 */
gf.graphics.Texture.prototype.discard = function() {
  var gl = this.graphicsContext.gl;

  gl.deleteTexture(this.handle);
  this.handle = null;

  goog.base(this, 'discard');
};


/**
 * @override
 */
gf.graphics.Texture.prototype.restore = function() {
  var gl = this.graphicsContext.gl;

  goog.base(this, 'restore');

  if (this.handle) {
    gl.deleteTexture(this.handle);
  }
  this.handle = gl.createTexture();

  // TODO(benvanik): only set dirty if the values differ from the defaults
  this.dirtyFlags_ = gf.graphics.Texture.DirtyFlags_.ALL;
};


/**
 * Binds the texture to the currently active unit.
 */
gf.graphics.Texture.prototype.bind = function() {
  var gl = this.graphicsContext.gl;

  gl.bindTexture(goog.webgl.TEXTURE_2D, this.handle);

  var dirtyFlags = this.dirtyFlags_;
  this.dirtyFlags_ = 0;
  if (dirtyFlags & gf.graphics.Texture.DirtyFlags_.MIN_FILTER) {
    gl.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_MIN_FILTER,
        this.minFilter_);
  }
  if (dirtyFlags & gf.graphics.Texture.DirtyFlags_.MAG_FILTER) {
    gl.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_MAG_FILTER,
        this.magFilter_);
  }
  if (dirtyFlags & gf.graphics.Texture.DirtyFlags_.WRAP_S) {
    gl.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_WRAP_S,
        this.wrapS_);
  }
  if (dirtyFlags & gf.graphics.Texture.DirtyFlags_.WRAP_T) {
    gl.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_WRAP_T,
        this.wrapT_);
  }
  if (dirtyFlags & gf.graphics.Texture.DirtyFlags_.MAX_ANISOTROPY) {
    if (this.graphicsContext.extensions.isSupported(
        gf.graphics.ExtensionName.EXT_texture_filter_anisotropic)) {
      gl.texParameteri(
          goog.webgl.TEXTURE_2D,
          goog.webgl.TEXTURE_MAX_ANISOTROPY_EXT,
          this.maxAnisotropy_);
    }
  }
};


/**
 * Sets a new texture filtering mode, clearing any previous stack.
 * @param {number} minFilter Texture filtering mode (NEAREST/LINEAR/etc).
 * @param {number} magFilter Texture filtering mode (NEAREST/LINEAR/etc).
 */
gf.graphics.Texture.prototype.setFilteringMode = function(
    minFilter, magFilter) {
  if (this.minFilter_ != minFilter) {
    this.dirtyFlags_ |= gf.graphics.Texture.DirtyFlags_.MIN_FILTER;
    this.minFilter_ = minFilter;
  }
  if (this.magFilter_ != magFilter) {
    this.dirtyFlags_ |= gf.graphics.Texture.DirtyFlags_.MAG_FILTER;
    this.magFilter_ = magFilter;
  }
};


/**
 * Sets a new texture filtering mode, clearing any previous stack.
 * @param {number} wrapS Texture wrapping mode (CLAMP_TO_EDGE/REPEAT/etc).
 * @param {number} wrapT Texture wrapping mode (CLAMP_TO_EDGE/REPEAT/etc).
 */
gf.graphics.Texture.prototype.setWrappingMode = function(wrapS, wrapT) {
  if (this.wrapS_ != wrapS) {
    this.dirtyFlags_ |= gf.graphics.Texture.DirtyFlags_.WRAP_S;
    this.wrapS_ = wrapS;
  }
  if (this.wrapT_ != wrapT) {
    this.dirtyFlags_ |= gf.graphics.Texture.DirtyFlags_.WRAP_T;
    this.wrapT_ = wrapT;
  }
};


/**
 * Gets the maximum anisotropic filtering value used on this texture.
 * @return {number} Max anisotropy value.
 */
gf.graphics.Texture.prototype.getMaxAnisotropy = function() {
  return this.maxAnisotropy_;
};


/**
 * Sets the maximum anisotropic filtering value used on this texture.
 * The default is 1. Valid values range from 1 to the value of
 * {@code MAX_TEXTURE_MAX_ANISOTROPY_EXT}.
 * @param {number} value New max anisotropy value.
 */
gf.graphics.Texture.prototype.setMaxAnisotropy = function(value) {
  if (value < 1) {
    value = 1;
  }
  if (this.maxAnisotropy_ != value) {
    this.dirtyFlags_ |= gf.graphics.Texture.DirtyFlags_.MAX_ANISOTROPY;
    this.maxAnisotropy_ = value;
  }
};


/**
 * Gets the number of channels per pixel in the given format.
 * @param {number} format WebGL texture format (RGB/RGBA/etc).
 * @return {number} Number of channels per pixel.
 */
gf.graphics.Texture.getChannelsPerPixel = function(format) {
  switch (format) {
    case goog.webgl.ALPHA:
    case goog.webgl.LUMINANCE:
      return 1;
    case goog.webgl.LUMINANCE_ALPHA:
      return 2;
    case goog.webgl.RGB:
    case goog.webgl.COMPRESSED_RGB_S3TC_DXT1_EXT:
      return 3;
    case goog.webgl.RGBA:
    case goog.webgl.COMPRESSED_RGBA_S3TC_DXT1_EXT:
    case goog.webgl.COMPRESSED_RGBA_S3TC_DXT3_EXT:
    case goog.webgl.COMPRESSED_RGBA_S3TC_DXT5_EXT:
      return 4;
    default:
      goog.asserts.fail('Unsupported texture format: ' + format);
      return 0;
  }
};


/**
 * Sets up rectangular uniform slot entries.
 * Resets any previous slot data.
 * @param {number} slotWidth Width, in px, of each slot.
 * @param {number} slotHeight Height, in px, of each slot.
 */
gf.graphics.Texture.prototype.setupUniformSlots =
    function(slotWidth, slotHeight) {
  this.slots_ = [];

  var slotsWide = this.width / slotWidth;
  var slotsHigh = this.height / slotHeight;
  for (var y = 0, n = 0; y < slotsHigh; y++) {
    var ty = y / slotsHigh;
    for (var x = 0; x < slotsWide; x++, n++) {
      var tx = x / slotsWide;
      this.slots_[n] = goog.vec.Vec4.createFloat32FromValues(
          tx, ty, tx + 1 / slotsWide, ty + 1 / slotsHigh);
    }
  }
};


/**
 * Gets the texture coordinates of a given slot.
 * @param {number} index Slot index.
 * @param {!goog.vec.Vec4.Type} texCoords 4-element array receiving the
 *     texture coordinates as [tu0, tv0, tu1, tv1].
 * @return {!goog.vec.Vec4.Type} texCoords to enable chaining.
 */
gf.graphics.Texture.prototype.getSlotCoords = function(index, texCoords) {
  if (this.slots_) {
    var coords = this.slots_[index];
    if (coords) {
      goog.vec.Vec4.setFromArray(texCoords, coords);
    }
  }
  return texCoords;
};
