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
 * @fileoverview IdentityInputValue are input values take in a shaderVariable in
 *      its constructor and return it with getShaderVariable.
 *      IdentityInputValue should only be created by a
 *      {@code glslunit.testing.UntypedValue}.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.IdentityInputValue');

goog.require('glslunit.ShaderVariable');



/**
 * Constructs a IdentityInputValue.  This should only be created by an
 *     UntypedTestValue.
 * @constructor
 * @param {!glslunit.ShaderVariable} shaderVariable The ShaderVariable to
 *     to be used when running this test.
 * @implements {glslunit.testing.InputValue}
 */
glslunit.testing.IdentityInputValue = function(shaderVariable) {
  /**
   * The ShaderVariable to be used when running this test.
   * @type {!glslunit.ShaderVariable}
   * @private
   */
  this.shaderVariable_ = shaderVariable;
};


/** @inheritDoc */
glslunit.testing.IdentityInputValue.prototype.getShaderVariable = function() {
  return this.shaderVariable_;
};
