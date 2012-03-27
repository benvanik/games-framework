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
 * @fileoverview Implementation of a TestExpectedValue for global variables or
 *     other statements that can be correctly evaluated in the global scope.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.GlobalValue');

goog.require('glslunit.glsl.parser');
goog.require('glslunit.testing.ValueBeingTested');


/**
 * Creates a GlobalExpectedValue
 * @param {string} valueSource The GLSL source code for the value being tested.
 * @constructor
 * @implements {glslunit.testing.ValueBeingTested}
 */
glslunit.testing.GlobalValue = function(valueSource) {
  /**
   * The GLSL source code for the value being tested.
   * @type {string}
   * @private
   */
  this.valueSource_ = valueSource;
};


/** @inheritDoc */
glslunit.testing.GlobalValue.prototype.getValueAst = function() {
  return glslunit.glsl.parser.parse(this.valueSource_, 'assignment_expression');
};
