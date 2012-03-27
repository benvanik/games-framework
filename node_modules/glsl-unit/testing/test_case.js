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
 * @fileoverview Defines the interface for declaring GLSL Test cases.  The
 * TestCase should be created by a TestSuite which will bootstrap the values
 * needed to run the test (context, viewportHeight, viewportWidth, sourceAst),
 * leaving it up to the developer to describe the test case and create the
 * function that defines the test case.
 *
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.TestCase');

goog.require('glslunit.FragmentExecutor');
goog.require('glslunit.Generator');
goog.require('glslunit.NodeCollector');
goog.require('glslunit.ShaderVariable');
goog.require('glslunit.SpliceTransformer');
goog.require('glslunit.VariableScopeVisitor');
goog.require('glslunit.VertexExecutor');
goog.require('glslunit.glsl.parser');
goog.require('glslunit.testing.ComparisonExpectation');
goog.require('glslunit.testing.ComparisonTester');
goog.require('glslunit.testing.DiscardExpectation');
goog.require('glslunit.testing.Expectation');
goog.require('glslunit.testing.GlobalValue');
goog.require('glslunit.testing.InputValue');
goog.require('glslunit.testing.UntypedValue');


/**
 * Creates a new TestCase.  TestCases's should only be instantiated by
 *     TestSuites.
 * @param {!WebGLRenderingContext} context The WebGL context to use to run the
 *     test.
 * @param {number} viewportHeight The height of context's canvas.
 * @param {number} viewportWidth The width of context's canvas.
 * @param {glslunit.testing.TestCase.TestType} testType The type of test being
 *     run.
 * @param {!Object} sourceAst The AST for the source code under test.
 * @param {string} description The description of this test case.
 * @param {function(WebGLRenderingContext=)} testFn The function defining this
 *     test case.
 * @constructor
 */
glslunit.testing.TestCase = function(context, viewportHeight, viewportWidth,
                                     testType, sourceAst, description, testFn) {
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

  /**
   * The AST for the source code under test.
   * @type {!Object}
   * @private
   */
  this.sourceAst_ = sourceAst;

  /**
   * The description of this test case.
   * @type {string}
   * @private
   */
  this.description_ = description;

  /**
   * The function declaring the test case's values and expectations.
   * @type {function(WebGLRenderingContext=)}
   * @private
   */
  this.testFn_ = testFn;

  /**
   * The values to use when running this test case.  These should be added
   *     inside of testFn with the 'set' function.  This maps the name of the
   *     variable to it InputValue.
   * @type {!Object.<string, !glslunit.testing.InputValue>}
   * @private
   */
  this.values_ = {};

  /**
   * List of definitions inside of this test case.
   * @type {!Array.<string>}
   * @private
   */
  this.defines_ = [];

  /**
   * The list of expectations this test case has.
   * @type {!Array.<!glslunit.testing.Expectation>}
   * @private
   */
  this.expectations_ = [];

  /**
   * Whether or not the test ran and passed.
   * @type {boolean}
   * @private
   */
  this.testPassed_ = false;

  /**
   * List of warnings during execution of the test case.
   * @type {!Array.<string>}
   * @private
   */
   this.testWarnings_ = [];

   /**
    * Map of a global variable name to it's declarator node.
    * @type {!Object.<string, Object>}
    * @private
    */
   this.globalVariableNames_ = {};

   // Get a list of globals accessed by the shader.
   // First, get a list of all global attributes and uniforms.
   var globalVariables =
     glslunit.VariableScopeVisitor.getVariablesInScope(this.sourceAst_,
                                                       this.sourceAst_,
                                                       true);

   // Now collect the built in properties.  We only do this if the test case is
   // a fragment test case, since only fragment test cases can read from the
   // built in values.
   if (this.testType_ == glslunit.testing.TestCase.TestType.FRAGMENT) {
     var builtInNames = {};
     goog.array.forEach(glslunit.utils.BUILT_IN_GLOBALS,
         function(x) {
       return builtInNames[x.declarators[0].name.name] = x;
     });
     var builtInRefs =
         glslunit.NodeCollector.collectNodes(this.sourceAst_, function(x) {
       return x.type == 'identifier' && x.name in builtInNames;
     });
     goog.array.forEach(builtInRefs, function(x) {
       globalVariables[x.name] = builtInNames[x.name];
     });
   }
   for (var i in globalVariables) {
     var global = globalVariables[i];
     // 'const' is the only qualifier that can't be set by a shader unit test.
     if (global.typeAttribute.qualifier &&
         global.typeAttribute.qualifier != 'const' &&
         !(this.testType == glslunit.testing.TestCase.TestType.VERTEX &&
           global.typeAttribute.qualifier.search('varying') != -1)) {
       this.globalVariableNames_[i] = global;
     }
   }
};


/**
 * Enum defining the type of test case being run.
 * @enum {number}
 */
glslunit.testing.TestCase.TestType = {
  VERTEX: 0,
  FRAGMENT: 1
};


/**
 * Gets the description for this TestCase.
 * @return {string} The description for this TestCase.
 */
glslunit.testing.TestCase.prototype.getDescription = function() {
  return this.description_;
};


/**
 * Gets the list of warnings hit during the test case.
 * @return {!Array.<string>} The list of warnings.
 */
glslunit.testing.TestCase.prototype.getTestWarnings = function() {
  return this.testWarnings_;
};



/**
 * Gets whether or not the test case has been run and passed.
 * @return {boolean} True if the test case has been run and all test
 *     expectations passed, false otherwise.
 */
glslunit.testing.TestCase.prototype.getTestPassed = function() {
  return this.testPassed_;
};


/**
 * Returns the set of expectations added by the test function.  If
 *     getExpectations is called before run is called, it will always return an
 *     empty array.
 * @return {!Array.<!glslunit.testing.Expectation>} The set of expectations
 *     added by the test function.
 */
glslunit.testing.TestCase.prototype.getExpectations = function() {
  return this.expectations_;
};


/**
 * Runs the test case.
 * @return {boolean} True if the test passed, false otherwise.
 */
glslunit.testing.TestCase.prototype.run = function() {
  //Create global test functions.
  window.define = goog.bind(function(defineText) {
    this.defines_.push(defineText);
  }, this);
  window.set = goog.bind(function(variableName) {
    var newValue = new glslunit.testing.UntypedValue(variableName);
    this.values_[variableName] = newValue;
    return newValue;
  }, this);
  window.expect = goog.bind(function(variableName) {
    var expectationValue = new glslunit.testing.GlobalValue(variableName);
    var expectation =
      new glslunit.testing.ComparisonExpectation(expectationValue);
    this.expectations_.push(expectation);
    return expectation.getTest();
  }, this);
  if (this.testType_ == glslunit.testing.TestCase.TestType.FRAGMENT) {
    window.expectDiscard = goog.bind(function() {
      var expectation = new glslunit.testing.DiscardExpectation();
      this.expectations_.push(expectation);
      return expectation;
    }, this);
  }

  // Clear any existing expectations and variables if the test is being re-run.
  this.expectations_ = [];
  this.values_ = [];
  this.defines_ = [];
  this.testWarnings_ = [];

  // Run the Test case
  this.testFn_(this.context_);

  // Delete the global test functions.
  delete window.define;
  delete window.set;
  delete window.expect;
  delete window.expectDiscard;

  var variables = [];
  var setVariables = {};
  for (var i in this.values_) {
    var shaderVariable = this.values_[i].getShaderVariable();
    setVariables[shaderVariable.getName()] = true;
    variables.push(shaderVariable);
  }

  for (var i in this.globalVariableNames_) {
    if (!(i in setVariables)) {
      this.testWarnings_.push('Warning: variable "' + i + '" was not set.  ' +
          'Expected input of type "' +
          glslunit.Generator.getSourceCode(
              this.globalVariableNames_[i].typeAttribute) + '"');
    }
  }

  var testAst = this.sourceAst_;
  // If this test case defined any preprocessor directives, splice them in at
  // the top of the source code.
  if (this.defines_.length > 0) {
    var defineText =
        this.defines_.map(function(x) {return '#define ' + x;}).join('\n');
    var defineNodes = glslunit.glsl.parser.parse(defineText).statements;
    testAst = glslunit.SpliceTransformer.splice(
        testAst, testAst, 'statements', 0, 0, defineNodes);
  }

  var executorClass =
    this.testType_ == glslunit.testing.TestCase.TestType.FRAGMENT ?
      glslunit.FragmentExecutor : glslunit.VertexExecutor;

  var executor = new executorClass(this.context_, testAst, variables,
                                   this.viewportHeight_, this.viewportWidth_);

  this.testPassed_ = true;
  goog.array.forEach(this.expectations_, function(expectation) {
    expectation.run(executor);
    this.testPassed_ = this.testPassed_ && expectation.getTestPassed();
  }, this);

  return this.testPassed_;
};
