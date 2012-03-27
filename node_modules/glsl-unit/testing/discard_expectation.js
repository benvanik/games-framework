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
 * @fileoverview DiscardExpectation is a test expectation that passes if a
 * shader discarded.
 *
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.DiscardExpectation');

goog.require('glslunit.Executor');
goog.require('glslunit.glsl.parser');
goog.require('glslunit.testing.Expectation');



/**
 * Constructs a DiscardExpectation.
 * @extends {glslunit.testing.Expectation}
 * @constructor
 */
glslunit.testing.DiscardExpectation = function() {
  goog.base(this);
};
goog.inherits(glslunit.testing.DiscardExpectation,
              glslunit.testing.Expectation);


/** {@inheritDoc} */
glslunit.testing.DiscardExpectation.prototype.run = function(executor) {
  var testAst = glslunit.glsl.parser.parse('vec4(0.,1.,0.,1.)',
                                           'assignment_expression');
  var testResult = executor.extractValue(testAst);
  this.testPassed = (testResult == glslunit.Executor.DecodeStatus.DISCARD);
};


/** {@inheritDoc} */
glslunit.testing.DiscardExpectation.prototype.getFailureString = function() {
  return 'Expected shader would discard but it didn\'t';
};
