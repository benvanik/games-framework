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
 * @fileoverview  Base class for for expectations inside of test cases.  The
 *     base class stores whether or not the test passed as well as the actual
 *     value if the test failed.  Expectations should only be instantiated
 *     by the TestCase class.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.Expectation');

goog.require('glslunit.ExtractedValue');



/**
 * Base class for GLSL test expectations.  Implements a "run" method which
 *     stores whether or not the test passed as well as the actual value.
 * @constructor
 */
glslunit.testing.Expectation = function() {
  /**
   * Whether or not the expectation passed.
   * @type {boolean}
   * @protected
   */
  this.testPassed = false;
};


/**
 * Gets whether or not the expectation passed.
 * @return {boolean} Whether or not the expectation passed.
 */
glslunit.testing.Expectation.prototype.getTestPassed = function() {
  return this.testPassed;
};


/**
 * Runs the expectation, storing whether or not the expectation passed and the
 *     actual value if it failed.
 * @param {glslunit.Executor} executor The executor to use to run this
 *     expectation.
 */
glslunit.testing.Expectation.prototype.run = goog.abstractMethod;


/**
 * Gets a string describing the failure if this expectation failed.
 * @return {string} The string describing the failure.
 */
glslunit.testing.Expectation.prototype.getFailureString = goog.abstractMethod;
