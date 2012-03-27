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
 * @fileoverview ComparisonExpectation is a test expectation that compares a
 * value to a known good value.  It passes if the comparison evaluates to true,
 * fails otherwise.
 *
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.ComparisonExpectation');

goog.require('glslunit.Executor');
goog.require('glslunit.Generator');
goog.require('glslunit.glsl.parser');
goog.require('glslunit.testing.ComparisonTester');
goog.require('glslunit.testing.Expectation');
goog.require('glslunit.testing.ValueBeingTested');



/**
 * Constructs a ComparisonExpectation.
 * @param {!glslunit.testing.ValueBeingTested} value The expected value to
 *     compare against.
 * @extends {glslunit.testing.Expectation}
 * @constructor
 */
glslunit.testing.ComparisonExpectation = function(value) {
  goog.base(this);

  /**
   * The value being compared to in this expectation.
   * @type {glslunit.testing.ValueBeingTested}
   * @private
   */
  this.value_ = value;

  /**
   * The test operation to use when testing this expectation.
   * @type {glslunit.testing.ComparisonTester}
   * @private
   */
  this.test_ = new glslunit.testing.ComparisonTester();

  /**
   * If the expectation failed, the actual value.  If the expectation failed
   * because of a mismatch between the values at different vertices, this will
   * contain an array of extracted values at each vertex.
   * @type {glslunit.ExtractedValue|Array.<glslunit.ExtractedValue>}
   * @private
   */
  this.actualValue_ = [];

  /**
   * Whether or not we hit a mismatch while extracting values.
   * @type {boolean}
   * @private
   */
  this.extractedMismatch_ = false;
};
goog.inherits(glslunit.testing.ComparisonExpectation,
              glslunit.testing.Expectation);


/**
 * Gets the expectation's test.
 * @return {glslunit.testing.ComparisonTester} The expectation's test.
 */
glslunit.testing.ComparisonExpectation.prototype.getTest = function() {
  return this.test_;
};


/** {@inheritDoc} */
glslunit.testing.ComparisonExpectation.prototype.run = function(executor) {
  var valueAst = this.value_.getValueAst();
  var testResult = executor.extractValue(
      this.test_.getTestAstNode(valueAst));
  this.testPassed = Math.round(testResult) == 1;

  if (testResult == glslunit.Executor.DecodeStatus.MISMATCH) {
    this.actualValue_ = glslunit.Executor.DecodeStatus.MISMATCH;
  } else {
    if (!this.testPassed) {
      this.actualValue_ = this.extractActualValue_(executor);
    }
  }

  // If either the original test had a mismatch OR the extraction of failed
  // values had a mismatch, then extract the mismatched values.
  if (this.actualValue_ == glslunit.Executor.DecodeStatus.MISMATCH) {
    this.actualValue_ = this.extractMismatch_(executor);
  }
};


/**
 * Extracts the mismatched values at each vertex if there was a mismatch
 * between the values at each vertex.
 * @param {glslunit.Executor} executor The executor to use to extract the
 *     mismatched values.
 * @return {Array.<glslunit.ExtractedValue>} An array of the actual values at
 *     each vertex.
 */
glslunit.testing.ComparisonExpectation.prototype.extractMismatch_ =
    function(executor) {
  this.extractedMismatch_ = true;
  var result = [];
  for (var i = 0; i < glslunit.Executor.TEST_VERTEX_COUNT; i++) {
    result.push(this.extractActualValue_(executor, i));
  }
  return result;
};


/**
 * Extracts the actual value of a value being tested.
 * @param {glslunit.Executor} executor The executor to use to extract the actual
 *     values.
 * @param {number=} opt_decodeCorner Which corner to decode.  If
 *     opt_decodeCorner is set, mismatches between corners will be ignored and
 *     the value at the corner specified will be returned.  Should be [0-2].
 * @return {glslunit.ExtractedValue} The actual value of the value being tested.
 */
glslunit.testing.ComparisonExpectation.prototype.extractActualValue_ =
      function(executor, opt_decodeCorner) {
  var result;
  var valueAst = this.value_.getValueAst();
  var expectedValues = this.test_.getValues();
  // If the expected value is an array, attempt to extract every index of the
  // value it was compared against.
  if (goog.isArray(expectedValues)) {
    result = [];
    var valueSource = glslunit.Generator.getSourceCode(valueAst);
    for (var i = 0; i < expectedValues.length; i++) {
      var indexAst = glslunit.glsl.parser.parse(valueSource + '[' + i + ']',
                                                'assignment_expression');
      var extractedValue = executor.extractValue(indexAst, opt_decodeCorner);
      // If we hit a mismatch during the extraction of the actual values, return
      // the fact we hit a mismatch so we can extract the mismatched values.
      if (extractedValue == glslunit.Executor.DecodeStatus.MISMATCH) {
        return extractedValue;
      }
      result.push(extractedValue);
    }
  } else {
    result = executor.extractValue(valueAst, opt_decodeCorner);
  }
  return result;
};


/** {@inheritDoc} */
glslunit.testing.ComparisonExpectation.prototype.getFailureString = function() {
  var valueSource = glslunit.Generator.getSourceCode(this.value_.getValueAst());
  var epsilonMagnitude =
    Math.round(Math.log(Math.max(0.1, this.test_.getEpsilon())) /
                                 Math.LN10);
  var roundToEpsilon = function(value) {
    if (goog.isArray(value)) {
      return value.map(roundToEpsilon);
    }
    if (!goog.isNumber(value)) {
      return value;
    }
    var roundMultiplier = Math.pow(10, -1 * epsilonMagnitude);
    return Math.round(value * roundMultiplier) / roundMultiplier;
  }

  var expectedString = 'Expected ' + valueSource + ' ' +
      this.test_.getOperator() + ' ' + this.test_.getValues() +
      ' with allowable error of ' + this.test_.getEpsilon();
  if (this.extractedMismatch_) {
    return 'There was a mismatch between values at each test vertex.  ' +
        'This should not happen and usually indicates a driver bug.\n' +
        expectedString + '\n' +
        this.actualValue_.map(function(value, index) {
          return '\tVertex ' + index + ' had value ' + roundToEpsilon(value);
        }).join('\n');
  } else {
    return expectedString + ', was ' + roundToEpsilon(this.actualValue_);
  }
};
