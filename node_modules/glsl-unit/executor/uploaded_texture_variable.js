// Copyright 2011 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Shader Variable that's used to pass texture information to the
 *     graphics card for textures that have already been uploaded.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.UploadedTextureVariable');

goog.require('glslunit.ShaderVariable');
goog.require('goog.array');



/**
 * Constructs a UploadedTextureVariable.
 * @param {string} name The name of the variable.
 * @param {WebGLTexture} texture The texture that's already been uploaded.
 * @extends {glslunit.ShaderVariable}
 * @constructor
 */
glslunit.UploadedTextureVariable = function(name, texture) {
  goog.base(this, name, true);

  /**
   * The texture that's already been uploaded to the graphics card.
   * @type {WebGLTexture}
   * @private
   */
  this.texture_ = texture;

  /**
   * The texture unit to use when binding this texture to its shader variable.
   * @type {?number}
   * @private
   */
  this.textureUnit_ = null;
};
goog.inherits(glslunit.UploadedTextureVariable, glslunit.ShaderVariable);


/** @inheritDoc */
glslunit.UploadedTextureVariable.prototype.bufferData = function(
    context, program, numTestVerticies, nextTextureUnit) {
  // BufferData only needs to save off the textureUnit to be used here b/c
  // the texture has already been uploaded.
  this.textureUnit_ = nextTextureUnit;
};


/** @inheritDoc */
glslunit.UploadedTextureVariable.prototype.bindData =
    function(context, program) {
  if (this.texture_ && this.textureUnit_ != null) {
    context.activeTexture(context.TEXTURE0 + this.textureUnit_);
    context.bindTexture(context.TEXTURE_2D, this.texture_);
    context.uniform1i(/** @type {WebGLUniformLocation} */ (
            this.getLocation(context, program)),
            /** @type {number} */ (this.textureUnit_));
  }
};


/** @override */
glslunit.UploadedTextureVariable.prototype.cleanUp = function(context) {
  // Whoever uploaded the texture is responsible for cleaning it up.
};
