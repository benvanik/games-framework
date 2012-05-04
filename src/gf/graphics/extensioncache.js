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

goog.provide('gf.graphics.ExtensionCache');
goog.provide('gf.graphics.ExtensionName');

goog.require('goog.asserts');


/**
 * All known WebGL extensions from the Khronos WebGL extension registry:
 * http://www.khronos.org/registry/webgl/extensions/
 * The values of each member is the extension number from the registry.
 * @enum {number}
 */
gf.graphics.ExtensionName = {
  OES_texture_float: 1,
  OES_texture_half_float: 2,
  WEBGL_lose_context: 3,
  OES_standard_derivatives: 4,
  OES_vertex_array_object: 5,
  WEBGL_debug_renderer_info: 6,
  WEBGL_debug_shaders: 7,
  WEBGL_compressed_texture_s3tc: 8,
  OES_depth_texture: 9,
  OES_element_index_uint: 10,
  EXT_texture_filter_anisotropic: 11,

  /** Should be the value of the largest extension number. */
  MAX_EXTENSION_NUMBER: 11
};


/**
 * Converts the given extension name constant to the canonical name string.
 * @param {gf.graphics.ExtensionName} name Extension name constant.
 * @return {string?} Extension string for the given name, or null if the name
 *     is not recognized.
 */
gf.graphics.ExtensionName.toString = function(name) {
  switch (name) {
    case gf.graphics.ExtensionName.OES_texture_float:
      return 'OES_texture_float';
    case gf.graphics.ExtensionName.OES_texture_half_float:
      return 'OES_texture_half_float';
    case gf.graphics.ExtensionName.WEBGL_lose_context:
      return 'WEBGL_lose_context';
    case gf.graphics.ExtensionName.OES_standard_derivatives:
      return 'OES_standard_derivatives';
    case gf.graphics.ExtensionName.OES_vertex_array_object:
      return 'OES_vertex_array_object';
    case gf.graphics.ExtensionName.WEBGL_debug_renderer_info:
      return 'WEBGL_debug_renderer_info';
    case gf.graphics.ExtensionName.WEBGL_debug_shaders:
      return 'WEBGL_debug_shaders';
    case gf.graphics.ExtensionName.WEBGL_compressed_texture_s3tc:
      return 'WEBGL_compressed_texture_s3tc';
    case gf.graphics.ExtensionName.OES_depth_texture:
      return 'OES_depth_texture';
    case gf.graphics.ExtensionName.OES_element_index_uint:
      return 'OES_element_index_uint';
    case gf.graphics.ExtensionName.EXT_texture_filter_anisotropic:
      return 'EXT_texture_filter_anisotropic';
    default:
      return null;
  }
};



/**
 * A cache for detected and obtained WebGL extensions.
 *
 * @constructor
 */
gf.graphics.ExtensionCache = function() {
  /**
   * WebGL context.
   * @private
   * @type {WebGLRenderingContext}
   */
  this.gl_ = null;

  /**
   * A map-as-array, with each index corresponding to an extension registry
   * number and the value indicating whether or not the extension is supported
   * by the current GL context.
   * @private
   * @type {!Array.<boolean>}
   */
  this.supportedExtensions_ = new Array(
      gf.graphics.ExtensionName.MAX_EXTENSION_NUMBER);

  /**
   * A map-as-array, with each index corresponding to an extension registry
   * number and the value an extension object, if has been queried and was
   * supported.
   * @private
   * @type {!Array.<Object>}
   */
  this.extensions_ = new Array(
      gf.graphics.ExtensionName.MAX_EXTENSION_NUMBER);
};


/**
 * Sets up the extension cache based on the given GL context.
 * The given GL context will be used in the future when querying extensions.
 * @param {!WebGLRenderingContext} gl WebGL context.
 */
gf.graphics.ExtensionCache.prototype.setup = function(gl) {
  // Have to hang on to this to query for extensions later
  this.gl_ = gl;

  // Detect extensions (and reset unknown ones)
  var exts = gl.getSupportedExtensions();
  for (var n = 0; n < this.supportedExtensions_.length; n++) {
    this.supportedExtensions_[n] = false;
    this.extensions_[n] = null;

    // Note that this assumes that extensions are returned from
    // getSupportedExtensions with their canonical casing
    var name = gf.graphics.ExtensionName.toString(
        /** @type {gf.graphics.ExtensionName} */ (n));
    if (name) {
      // Check against all supported extension strings excluding vendor prefix
      for (var m = 0; m < exts.length; m++) {
        var ext = exts[m];
        var i = ext.indexOf(name);
        if (i != -1 && name.length == ext.length - i) {
          this.supportedExtensions_[n] = true;
          break;
        }
      }
    }
  }
};


/**
 * Checks for support of the given extension by name constant.
 * @param {gf.graphics.ExtensionName} name Extension name constant.
 * @return {boolean} True if the extension is supported.
 */
gf.graphics.ExtensionCache.prototype.isSupported = function(name) {
  return !!this.supportedExtensions_[name];
};


/**
 * Enables an extension by name constant, if it is supported.
 * @param {gf.graphics.ExtensionName} name Extension name constant.
 * @return {boolean} True if the extension was enabled.
 */
gf.graphics.ExtensionCache.prototype.enable = function(name) {
  return !!this.get(name);
};


/**
 * Queries for an extension by name constant.
 * @param {gf.graphics.ExtensionName} name Extension name constant.
 * @return {Object} An extension object, if it is supported.
 */
gf.graphics.ExtensionCache.prototype.get = function(name) {
  goog.asserts.assert(this.gl_);
  var ext = this.extensions_[name];
  if (!ext) {
    if (this.supportedExtensions_[name]) {
      var nameString = gf.graphics.ExtensionName.toString(name);
      if (!nameString) {
        return null;
      }
      ext = this.gl_.getExtension(nameString);
      this.extensions_[name] = ext;
    }
  }
  return ext;
};


/**
 * Gets the WEBGL_lose_context extension object, if it is supported.
 * @return {WEBGL_lose_context} The extension object, if supported.
 */
gf.graphics.ExtensionCache.prototype.get_WEBGL_lose_context = function() {
  return /** @type {WEBGL_lose_context} */ (this.get(
      gf.graphics.ExtensionName.WEBGL_lose_context));
};


/**
 * Gets the OES_vertex_array_object extension object, if it is supported.
 * @return {OES_vertex_array_object} The extension object, if supported.
 */
gf.graphics.ExtensionCache.prototype.get_OES_vertex_array_object = function() {
  return /** @type {OES_vertex_array_object} */ (this.get(
      gf.graphics.ExtensionName.OES_vertex_array_object));
};


/**
 * Gets the WEBGL_debug_shaders extension object, if it is supported.
 * @return {WEBGL_debug_shaders} The extension object, if supported.
 */
gf.graphics.ExtensionCache.prototype.get_WEBGL_debug_shaders = function() {
  return /** @type {WEBGL_debug_shaders} */ (this.get(
      gf.graphics.ExtensionName.WEBGL_debug_shaders));
};
