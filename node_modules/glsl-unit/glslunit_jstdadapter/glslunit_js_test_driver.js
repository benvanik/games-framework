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
 * @fileoverview Plugin for to hook up GLSLUnit to JSTestDriver.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.testing.GlslJstdAdapter');

goog.require('WebGLDebugUtils');
goog.require('glslunit.testing.TestSuite');
goog.require('goog.array');
goog.require('goog.string.format');
// Can't goog.require jstestdriver stuff b/c they don't export it with provide
// calls.  Since this plugin will only be loaded by jstestdriver, it's not a
// huge deal.


/**
 * Plugin for running GLSLUnit tests in JSTD.
 * @constructor
 */
glslunit.testing.GlslJstdAdapter = function() {
  this.name = 'glslunit';
  this.testSuites_ = [];
  this.canvas = null;

  // Create the global function for declaring shader test cases.
  window.vertexTestSuite = goog.bind(function(suiteName, shader, suiteFn) {
    var newSuite = goog.bind(function(gl) {
      return new glslunit.testing.TestSuite(
        gl, 50, 50,
        glslunit.testing.TestCase.TestType.VERTEX,
        suiteName, shader, suiteFn);
    }, this);
    this.testSuites_.push(newSuite);
  }, this);

  window.fragmentTestSuite = goog.bind(function(suiteName, shader, suiteFn) {
    var newSuite = goog.bind(function(gl) {
      return new glslunit.testing.TestSuite(
        gl, 50, 50,
        glslunit.testing.TestCase.TestType.FRAGMENT,
        suiteName, shader, suiteFn);
    }, this);
    this.testSuites_.push(newSuite);
  }, this);
};


/**
 * GLSLUnit test type.
 * @const
 */
glslunit.testing.GlslJstdAdapter.GLSLUNIT_TYPE = 'GLSL Unit Test';


/**
 * Setup function for a GLSLUnit test case.
 */
glslunit.testing.GlslJstdAdapter.prototype.onTestsStart = function() {
  this.canvas = document.createElement('canvas');
  this.canvas.height = 50;
  this.canvas.width = 50;
  document.body.appendChild(this.canvas);

  var throwOnGLError = function(err, funcName, args) {
    throw WebGLDebugUtils.glEnumToString(err) +
      ' was caused by call to ' + funcName;
  };
  this.gl = WebGLDebugUtils.makeDebugContext(
    this.canvas.getContext('experimental-webgl',
                           {'stencil': true, 'preserveDrawingBuffer': true}),
    throwOnGLError);
};


/**
 * Runs all of the GLS Unit test cases that were added and logs the results.
 * @param {*} config the jstd configuration for this test case.
 * @param {function()} onTestDone Callback function for a completed test case.
 * @param {function()} onComplete Callback function for a completed test suite.
 */
glslunit.testing.GlslJstdAdapter.prototype.runTestConfiguration =
    function(config, onTestDone, onComplete) {
  if (config.getTestCaseInfo().getType() !=
        glslunit.testing.GlslJstdAdapter.GLSLUNIT_TYPE) {
    return;
  }
  goog.array.forEach(this.testSuites_, function(testSuiteCtr) {
    var testSuite;
    var testStatus;
    var testLog = [];
    var start = goog.now();
    try {
      testSuite = testSuiteCtr(this.gl);
      testSuite.run();
    } catch (exception) {
      testStatus = 'error';
      testLog.push(exception.toString());
    }
    var end = goog.now();
    var testDone = function(testCaseName) {
      onTestDone(new jstestdriver.TestResult(testSuite.getDescription(),
                                             testCaseName,
                                             testStatus,
                                             '',
                                             testLog.join('\n'),
                                             end - start));
    };
    if (testStatus != 'error') {
      goog.array.forEach(testSuite.getTestCases(), function(testCase) {
        testLog = [];
        goog.array.forEach(testCase.getExpectations(), function(expectation, i)
        {
          var expectationResultString = expectation.getTestPassed() ?
            'Passed' :
            'Failed: ' + expectation.getFailureString();
          testLog.push(goog.string.format('Expectation %d %s.',
                                          i,
                                          expectationResultString));
        }, this);
        Array.prototype.push.apply(testLog, testCase.getTestWarnings());
        testStatus = testCase.getTestPassed() ? 'passed' : 'failed';
        testDone(testCase.getDescription());
      }, this);
    } else {
      // There was a Runtime exception while running the test case.  Log the
      // error.
      testDone('Runtime');
    }
  }, this);
};


/**
 * Cleanup after each run of a unit test by deleting the old canvas.
 */
glslunit.testing.GlslJstdAdapter.prototype.onTestsFinish = function() {
  document.body.removeChild(this.canvas);
};


/**
 * Adds a dummy test case to jstestdriver so we can run our tests.
 * @param {*} testCaseInfos Existing JSTestDriver test case infos.
 * @param {*} expressions Expressions.
 * @param {*} testRunsConfiguration Configuration to add our dummy test case to.
 * @return {boolean} Always returns true.
 */
glslunit.testing.GlslJstdAdapter.prototype.getTestRunsConfigurationFor =
    function(testCaseInfos, expressions, testRunsConfiguration) {
  testRunsConfiguration.push(
      new jstestdriver.TestRunConfiguration(
          new jstestdriver.TestCaseInfo(
              'GLSLUnit Tests',
              function() {},
              glslunit.testing.GlslJstdAdapter.GLSLUNIT_TYPE), []));

  return true;
};


/**
 * Register the plugin with JSTestDriver.
 */
jstestdriver.pluginRegistrar.register(
  new glslunit.testing.GlslJstdAdapter());
