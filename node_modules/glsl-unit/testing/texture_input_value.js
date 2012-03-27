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
 * @fileoverview TextureInputValue are used to specify textures for input
 *     variables inside of a test case.  TextureInputValue's should only be
 *     created by a {@code glslunit.testing.UntypedValue}.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.TextureInputValue');

goog.require('glslunit.ShaderVariable');
goog.require('glslunit.TextureShaderVariable');



/**
 * Constructs a TextureInputValue.  This should only be created by an
 *     UntypedTestValue.
 * @constructor
 * @param {!glslunit.TextureShaderVariable} shaderVariable The ShaderVariable to
 *     be used when running this test.
 * @implements {glslunit.testing.InputValue}
 */
glslunit.testing.TextureInputValue = function(shaderVariable) {
  /**
   * The ShaderVariable to be used when running this test.
   * @type {!glslunit.TextureShaderVariable}
   * @private
   */
  this.shaderVariable_ = shaderVariable;
};


/**
 * Sets an integer parameter on this texture when buffering it.
 * @param {number} name Name of the variable to be set.  Should come from a
 *     {@type WebGLRenderingContext}.
 * @param {number} value Value of variable to be set.  Should come from a
 *     {@type WebGLRenderingContext}.
 * @return {glslunit.testing.TextureInputValue} This input value.
 */
glslunit.testing.TextureInputValue.prototype.texParameteri = function(name,
                                                                      value) {
  this.shaderVariable_.addParameter(name, value, false);
  return this;
};


/**
 * Sets a float parameter on this texture when buffering it.
 * @param {number} name Name of the variable to be set.  Should come from a
 *     {@type WebGLRenderingContext}.
 * @param {number} value Value of variable to be set.  Should come from a
 *     {@type WebGLRenderingContext}.
 * @return {glslunit.testing.TextureInputValue} This input value.
 */
glslunit.testing.TextureInputValue.prototype.texParameterf = function(name,
                                                                      value) {
  this.shaderVariable_.addParameter(name, value, true);
  return this;
};


/**
 * Sets whether or not to create a Mipmap for this texture.
 * @return {glslunit.testing.TextureInputValue} This input value.
 */
glslunit.testing.TextureInputValue.prototype.withMipmap = function() {
  this.shaderVariable_.setUseMipmap(true);
  return this;
};


/** @inheritDoc */
glslunit.testing.TextureInputValue.prototype.getShaderVariable = function() {
  return this.shaderVariable_;
};
