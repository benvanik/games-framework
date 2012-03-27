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
 *     graphics card.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.TextureShaderVariable');

goog.require('glslunit.ShaderVariable');
goog.require('goog.array');



/**
 * Constructs a TextureShaderVariable.
 * @param {string} name The name of the variable.
 * @param {number} height The height of the texture in pixels.
 * @param {number} width The width of the texture in pixels.
 * @param {Uint8Array} data The texture data to use.
 * @extends {glslunit.ShaderVariable}
 * @constructor
 */
glslunit.TextureShaderVariable = function(name, height, width, data) {
  goog.base(this, name, true);

  /**
   * The height of the texture in pixels.
   * @type {number}
   * @private
   */
  this.height_ = height;

  /**
   * The width of the texture in pixels.
   * @type {number}
   * @private
   */
  this.width_ = width;

  /**
   * The texture data to use.
   * @type {Uint8Array}
   * @private
   */
  this.data_ = data;

  /**
   * Whether or not to generate a Mipmap for this texture.
   * @type {boolean}
   * @private
   */
  this.useMipmap_ = false;

  /**
   * The parameters to use when buffering data.
   * @type {Array.<{name: number, value: number, isFloat: boolean}>}
   * @private
   */
  this.parameters_ = [];

  /**
   * The texture created with bufferData.
   * @type {WebGLTexture}
   * @private
   */
  this.texture_ = null;

  /**
   * The texture unit to use when binding this texture to its shader variable.
   * @type {?number}
   * @private
   */
  this.textureUnit_ = null;
};
goog.inherits(glslunit.TextureShaderVariable, glslunit.ShaderVariable);


/**
 * Adds a parameter to set when buffering the texture.
 * @param {number} name The name of the parameter.
 * @param {number} value The value to pass in.
 * @param {boolean} isFloat True if this parameter is a float parameter, false
 *     if it is an integer value.
 */
glslunit.TextureShaderVariable.prototype.addParameter = function(name,
                                                                 value,
                                                                 isFloat) {
  this.parameters_.push({name: name, value: value, isFloat: isFloat});
};


/**
 * Sets whether or not to generate a mipmap with this texture.
 * @param {boolean} useMipmap Whether or not to generate a mipmap for this
 *     texture.
 */
glslunit.TextureShaderVariable.prototype.setUseMipmap = function(useMipmap) {
  this.useMipmap_ = useMipmap;
};


/** @override */
glslunit.TextureShaderVariable.prototype.bufferData = function(
    context, program, numTestVerticies, nextTextureUnit) {
  this.texture_ = context.createTexture();
  this.textureUnit_ = nextTextureUnit;
  context.bindTexture(context.TEXTURE_2D, this.texture_);

  context.texImage2D(context.TEXTURE_2D, 0, context.RGBA,
                     this.width_, this.height_, 0,
                     context.RGBA, context.UNSIGNED_BYTE, this.data_);

  goog.array.forEach(this.parameters_, function(parameter) {
    var paramFunc;
    if (parameter.isFloat) {
      paramFunc = context.texParameterf;
    } else {
      paramFunc = context.texParameteri;
    }
    paramFunc.apply(context,
                    [context.TEXTURE_2D, parameter.name, parameter.value]);
  }, this);
  if (this.useMipmap_) {
    context.generateMipmap(context.TEXTURE_2D);
  }
  context.bindTexture(context.TEXTURE_2D, null);
};


/** @override */
glslunit.TextureShaderVariable.prototype.bindData = function(context, program) {
  if (this.getTypeName() != 'sampler2D') {
    throw this.getName() + ' was bound as a texture, but is a ' +
        this.getTypeName();
  }
  if (this.texture_ && this.textureUnit_ != null) {
    context.activeTexture(context['TEXTURE' + this.textureUnit_]);
    context.bindTexture(context.TEXTURE_2D, this.texture_);
    context.uniform1i(/** @type {WebGLUniformLocation} */ (
            this.getLocation(context, program)),
            /** @type {number} */ (this.textureUnit_));
  }
};


/** @override */
glslunit.TextureShaderVariable.prototype.cleanUp = function(context) {
  goog.base(this, 'cleanUp', context);
  if (this.texture_) {
    context.deleteTexture(this.texture_);
  }
};
