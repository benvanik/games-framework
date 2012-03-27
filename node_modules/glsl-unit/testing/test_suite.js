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
 * @fileoverview Defines TestSuites for use in glsl unit tests.  TestSuites are
 * a collection of test cases for a particular type of shader (vertex or
 * fragment).  TestSuites are responsible for defining TestCases through their
 * testSuiteFn and for running all of those test cases defined.
 *
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.TestSuite');

goog.require('glslunit.testing.TestCase');

/**
 * @param {!WebGLRenderingContext} context The WebGL  context.
 * @param {number} viewportHeight The height of context's canvas.
 * @param {number} viewportWidth The width of context's canvas.
 * @param {glslunit.testing.TestCase.TestType} testType The type of test being
 *     run.
 * @param {string} description This TestSuite's description.
 * @param {string} source The GLSL Source code for this test suite.
 * @param {function(WebGLRenderingContext=)} testSuiteFn The function declaring
 *     all of this TestSuite's TestCase's.
 * @constructor
 */
glslunit.testing.TestSuite = function(context, viewportHeight, viewportWidth,
                                      testType, description, source,
                                      testSuiteFn) {

  /**
   * The WebGL context to use to run the test.
   * @type {!WebGLRenderingContext}
   * @private
   */
  this.context_ = context;

  /**
   * The height of context's canvas.
   * @type {number}
   * @private
   */
  this.viewportHeight_ = viewportHeight;

  /**
   * The width of context's canvas.
   * @type {number}
   * @private
   */
  this.viewportWidth_ = viewportWidth;

  /**
   * The type of test being run.
   * @type {glslunit.testing.TestCase.TestType}
   * @private
   */
  this.testType_ = testType;

  var startRule = testType == glslunit.testing.TestCase.TestType.FRAGMENT ?
    'fragment_start' : 'vertex_start';

  /**
   * The AST for the source code under test.
   * @type {!Object}
   * @private
   */
  this.sourceAst_ = glslunit.glsl.parser.parse(source, startRule);

  /**
   * List of test cases declared by testSuiteFn.
   * @type {!Array.<!glslunit.testing.TestCase>}
   * @private
   */
  this.testCases_ = [];

  /**
   * Whether or not this TestSuite was run and passed.
   * @type {boolean}
   * @private
   */
  this.suitePassed_ = false;

  /**
   * The function declaring all of this TestSuite's TestCase's
   * @type {function(WebGLRenderingContext=)}
   * @private
   */
  this.testSuiteFn_ = testSuiteFn;


  /**
   * The description for this TestSuite.
   * @type {string}
   * @private
   */
  this.description_ = description;
};


/**
 * Gets the description for this TestSuite.
 * @return {string} The description for this TestSuite.
 */
glslunit.testing.TestSuite.prototype.getDescription = function() {
  return this.description_;
};

/**
 * Gets whether or not the test suite has been run and passed.
 * @return {boolean} True if the test suite has been run and all test cases
 *     passed, false otherwise.
 */
glslunit.testing.TestSuite.prototype.getSuitePassed = function() {
  return this.suitePassed_;
};

/**
 * Gets the list of test cases added by TestFn.
 * @return {!Array.<!glslunit.testing.TestCase>} The list of test casses added
 *     by TestFn.  If called before 'run' is called, it will always return a
 *     empty Array.
 */
glslunit.testing.TestSuite.prototype.getTestCases = function() {
  return this.testCases_;
};


/**
 * Runs all of the test cases defined in this test suite.
 * @return {boolean} True if all of the test cases passed, false otherwise.
 */
glslunit.testing.TestSuite.prototype.run = function() {
  window.testMain = goog.bind(function(description, testFn) {
     var testCase = new glslunit.testing.TestCase(this.context_,
                                                  this.viewportHeight_,
                                                  this.viewportWidth_,
                                                  this.testType_,
                                                  this.sourceAst_,
                                                  description,
                                                  testFn);
     this.testCases_.push(testCase);
  }, this);

  // Clear out any existing test cases in case this is being re-run.
  this.testCases_ = [];

  // Run the test suite.
  this.testSuiteFn_(this.context_);
  delete window.testMain;

  this.suitePassed_ = true;
  goog.array.forEach(this.testCases_, function(testCase) {
    testCase.run();
    this.suitePassed_ = this.suitePassed_ && testCase.getTestPassed();
  }, this);
  return this.suitePassed_;
};
