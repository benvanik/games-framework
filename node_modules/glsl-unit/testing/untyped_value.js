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
 * @fileoverview UntypedValues are the jumping off point for creating test
 * values for shader test cases.  They take just the name of the variable, and
 * then provide the ability to specialize to different types with a fluent
 * interface.  A UntypedTestValue must be specialized in order to be used.
 * .asArray and .asNumber will create TestNumberValue's.
 * @author rowillia@google.com (Roy Williams)
 */


goog.provide('glslunit.testing.UntypedValue');

goog.require('glslunit.NumberShaderVariable');
goog.require('glslunit.TextureShaderVariable');
goog.require('glslunit.UploadedTextureVariable');
goog.require('glslunit.testing.IdentityInputValue');
goog.require('glslunit.testing.InputValue');
goog.require('glslunit.testing.NumericInputValue');
goog.require('glslunit.testing.TextureInputValue');


/**
 * Constructs a new UntypedValue.
 * @param {string} variableName The name of this variable.
 * @implements {glslunit.testing.InputValue}
 * @constructor
 */
glslunit.testing.UntypedValue = function(variableName) {
  /**
   * The name of this variable.
   * @type {string}
   * @private
   * @const
   */
  this.variableName_ = variableName;

  /**
   * The typed specialization of this value.
   * @type {glslunit.testing.InputValue}
   * @private
   */
  this.typedTestValue_ = null;
};


/**
 * Creates a new TextureInputValue to test with and uses the values argument
 *     passed in when testing.  The result value will be a texture of a single
 *     color.
 * @param {!Array.<number>} color The color to test with.
 * @return {!glslunit.testing.TextureInputValue} The specialized
 *     TextureShaderVariable.
 */
glslunit.testing.UntypedValue.prototype.asSingleColor = function(color) {
  if (color.length != 4) {
    throw 'Error while creating a Single Color for ' + this.variableName_ +
        ': Expected 4 components but found ' + color.length + ' components.';
  }
  var newVariable = new glslunit.TextureShaderVariable(this.variableName_,
                                                       1, 1,
                                                       new Uint8Array(color));
  this.typedTestValue_ = new glslunit.testing.TextureInputValue(newVariable);
  return this.typedTestValue_;
};


/**
 * Creates a new TextureInputValue to test with and uses the values argument
 *     passed in when testing.  The result will be a height x width texture.
 * @param {!Array.<number>} texture The texture to test with.
 * @param {number} height The height of the texture.
 * @param {number} width The width of the texture.
 * @return {!glslunit.testing.TextureInputValue} The specialized
 *     TextureShaderVariable.
 */
glslunit.testing.UntypedValue.prototype.as2DTexture =
      function(texture, height, width) {
  var componentCount = 4 * height * width;
  if (texture.length != componentCount) {
    throw 'Error while creating a 2D Texture for ' + this.variableName_ +
        ': Expected ' + componentCount + ' components but found ' +
        texture.length + ' components.';
  }
  var newVariable = new glslunit.TextureShaderVariable(this.variableName_,
                                                       height, width,
                                                       new Uint8Array(texture));
  this.typedTestValue_ = new glslunit.testing.TextureInputValue(newVariable);
  return this.typedTestValue_;
};


/**
 * Creates a shader variable for a texture taht's already been uploaded to the
 *     GPU.  This method explicitly doesn't return an InputValue because we
 *     expect any parameters on the texture would have been set
 *     in the same function that did the uploading.
 * @param {WebGLTexture} texture A Texture that's already been uploaded.
 */
glslunit.testing.UntypedValue.prototype.asUploadedTexture = function(texture) {
  var newVariable = new glslunit.UploadedTextureVariable(this.variableName_,
                                                         texture);
  this.typedTestValue_ = new glslunit.testing.IdentityInputValue(newVariable);
};


/**
 * Creates a new NumericInputValue to test with and uses the values argument
 *     passed in when testing.
 * @param {!Array.<number>} values The values to test with.
 * @return {!glslunit.testing.NumericInputValue} The specialized
 *     NumberShaderVariable.
 */
glslunit.testing.UntypedValue.prototype.asArray = function(values) {
  var newVariable = new glslunit.NumberShaderVariable(this.variableName_,
                                                      values);
  this.typedTestValue_ = new glslunit.testing.NumericInputValue(newVariable);
  return this.typedTestValue_;
};


/**
 * Creates a new NumericInputValue with a single number as the variable's value.
 * @param {number} value The value to test with.
 * @return {!glslunit.testing.NumericInputValue} The specialized
 *     NumberShaderVariable.
 */
glslunit.testing.UntypedValue.prototype.asNumber = function(value) {
  return this.asArray([value]);
};


/**
 * Shorthand for creating an identity matrix.
 * @return {!glslunit.testing.NumericInputValue} The specialized
 *     NumberShaderVariable containing the identity matrix.
 */
glslunit.testing.UntypedValue.prototype.asIdentityMatrix = function() {
  return this.asArray([1, 0, 0, 0,
                       0, 1, 0, 0,
                       0, 0, 1, 0,
                       0, 0, 0, 1]);
};


/**
 * Creates a new NumericInputValue with a single boolean as the variable's
 *     value.
 * @param {boolean} value The value to test with.
 * @return {!glslunit.testing.NumericInputValue} The specialized
 *     NumberShaderVariable.
 */
glslunit.testing.UntypedValue.prototype.asBoolean = function(value) {
  return this.asArray([Number(value)]);
};


/** @inheritDoc */
glslunit.testing.UntypedValue.prototype.getShaderVariable = function() {
  return this.typedTestValue_.shaderVariable_;
};
