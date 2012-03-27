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
 * @fileoverview NumericInputValue are used to specify numeric values for input
 *     variables inside of a test case.  NumericInputValue's should only be
 *     created by a {@code glslunit.testing.UntypedValue}.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.NumericInputValue');

goog.require('glslunit.NumberShaderVariable');
goog.require('glslunit.ShaderVariable');
goog.require('glslunit.TypedArrayConstructor');



/**
 * Constructs a NumericInputValue.  This should only be created by an
 *     UntypedTestValue.
 * @constructor
 * @param {!glslunit.NumberShaderVariable} shaderVariable The ShaderVariable to
 *     to be used when running this test.
 * @implements {glslunit.testing.InputValue}
 */
glslunit.testing.NumericInputValue = function(shaderVariable) {
  /**
   * The ShaderVariable to be used when running this test.
   * @type {!glslunit.NumberShaderVariable}
   * @private
   */
  this.shaderVariable_ = shaderVariable;

  /**
   * The type of TypedArray to use when buffering data for this value.
   * @type {?glslunit.TypedArrayConstructor}
   * @private
   */
  this.bufferType_ = null;
};


/**
 * Sets the type of TypedArray to use when buffering data for this test value.
 * @param {glslunit.TypedArrayConstructor} bufferType The type of TypedArray to
 *     use when buffering data for this test value.
 */
glslunit.testing.NumericInputValue.prototype.bufferedAs = function(bufferType) {
  this.bufferType_ = bufferType;
  this.shaderVariable_.setBufferType(bufferType);
};


/** @inheritDoc */
glslunit.testing.NumericInputValue.prototype.getShaderVariable = function() {
  return this.shaderVariable_;
};
