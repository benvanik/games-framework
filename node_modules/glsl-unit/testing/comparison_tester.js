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
 * @fileoverview
 *
 *
 * ComparisonTesters implement a fluent interface to make writing test cases as
 * easy as possible.  Expectations have 3 key parts.  An optional Vector
 * Comparison Type, the Comparison Type, and the allowed Epsilon.
 *
 * Vector Comparison Types:
 *   all - All components of the vector must pass their comparison.
 *   any - Any of the components of the vector must pass it's comparison.
 *
 * Comparison Type:
 *   equal
 *   notEqual - NOTE: notEqual will not respect any epsilon set.  It doesn't
 *     really make sense for a notEqual comparison to have an error.
 *   lessThan
 *   lessThanEqual
 *   greaterThan
 *   greaterThanEqual
 *
 * Epsilon - The error tolerance for comparisons.
 *
 * Examples:
 * expect("foo").all().lessThan([1, 2, 3, 4]).withEpsilonOf(1e-7);
 *
 * This would expect "foo" to be an vec4, and it would expect it to be less
 * than the vec4(1., 2., 3., 4.).  If foo isn't an vec4, an error is
 * thrown.  The GLSL code generated would be:
 *   all(lessThan(foo - 1e-7, vec4(1., 2., 3., 4.)))
 *
 * This will then be extracted using a {@code glslunit.Extractor}.
 *
 * expect("bar").equal(42).withEpsilonOf(1e-7);
 *
 * would generate the following GLSL code to be tested.
 *   abs(bar - 42) < 1e-7
 *
 *
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.ComparisonTester');

goog.require('glslunit.glsl.parser');
goog.require('goog.array');
goog.require('goog.string.format');



/**
 * Creates a ComparisonTester.
 * @constructor
 */
glslunit.testing.ComparisonTester = function() {

  /**
   * The operator to use when testing the expectation
   * @type {string}
   * @private
   */
  this.operator_ = '';

  /**
   * The values to compare with when testing.
   * @type {Array.<number>|number}
   * @private
   */
  this.values_ = [];

  /**
   * The absolute allowable error.
   * @type number
   * @private
   */
  this.epsilon_ = 0.0;


  /**
   * The type of test for a vector type.  Should be either 'all' or 'any'.
   * @type {string}
   * @private
   */
  this.vectorComparisonType_ = 'all';
};


/**
 * A map of operators to their function calls when comparing vectors instead of
 * values.
 * @const
 */
glslunit.testing.ComparisonTester.OperatorToFunction = {
  '<': 'lessThan', '<=': 'lessThanEqual',
  '>': 'greaterThan', '>=': 'greaterThanEqual',
  '==': 'equal', '!=': 'notEqual'
};


/**
 * Gets the values the comparison tester is testing against.
 * @return {Array.<number>|number} Values to test against.
 */
glslunit.testing.ComparisonTester.prototype.getValues = function() {
  return this.values_;
};

/**
 * Gets the epsilon value tested with.
 * @return {number} Epsilon tested with.
 */
glslunit.testing.ComparisonTester.prototype.getEpsilon = function() {
  return this.epsilon_;
};


/**
 * Gets the operator used in testing.
 * @return {string} Operator used in testing.
 */
glslunit.testing.ComparisonTester.prototype.getOperator = function() {
  return this.operator_;
};


/**
 * Gets the operation that should be performed to allow some error epsilon when
 *     comparing against the expected value.
 * @return {string|undefined} '+' if the epsilon should be added to the value,
 *     '-' if it should be subtracted, or undefined if neither.
 * @private
 */
glslunit.testing.ComparisonTester.prototype.getEpsilonDirection_ =
function() {
  var epsilonDirection;
  switch (this.operator_) {
    case '<':
    case '<=':
      epsilonDirection = '-';
      break;
    case '>':
    case '>=':
      epsilonDirection = '+';
      break;
  }
  return epsilonDirection;
};


/**
 * Gets the source code to test this expectation as a vector comparison.
 * @param {!Object} value The AST for the value being tested.
 * @return {string} The source code to test the expectation.
 * @private
 */
glslunit.testing.ComparisonTester.prototype.getVectorTestSource_ =
    function(value) {
  var expectSource = '';
  var vecType = 'vec' + this.values_.length;
  var epsilonDirection = this.getEpsilonDirection_();
  if (epsilonDirection) {
    expectSource = goog.string.format(
        '%s(%s(%s %s %s, %s(%s)))',
        this.vectorComparisonType_,
        glslunit.testing.ComparisonTester.OperatorToFunction[this.operator_],
        glslunit.Generator.getSourceCode(value),
        epsilonDirection,
        glslunit.Generator.formatFloat(this.epsilon_),
        vecType,
        this.values_.map(glslunit.Generator.formatFloat).join(','));
  } else {
    expectSource = goog.string.format(
        '%s(lessThanEqual(abs(%s - %s(%s)), %s(%s)))',
        this.vectorComparisonType_,
        glslunit.Generator.getSourceCode(value),
        vecType,
        this.values_.map(glslunit.Generator.formatFloat).join(','),
        vecType,
        goog.array.repeat(this.epsilon_, this.values_.length).map(
            glslunit.Generator.formatFloat).join(','));
    if (this.operator_ == '!=') {
      expectSource = '!' + expectSource;
    }
  }
  return expectSource;
};


/**
 * Gets the source code to test this expectation as a vector comparison.
 * @param {!Object} value The AST for the value being tested.
 * @return {string} The source code to test the expectation.
 * @private
 */
glslunit.testing.ComparisonTester.prototype.getScalarTestSource_ =
    function(value) {
  var epsilonDirection = this.getEpsilonDirection_();
  var expectSource;
  if (epsilonDirection) {
    expectSource = goog.string.format(
        '%s %s %s %s %s',
        glslunit.Generator.getSourceCode(value),
        epsilonDirection,
        glslunit.Generator.formatFloat(this.epsilon_),
        this.operator_,
        glslunit.Generator.formatFloat(/** @type {number} */(this.values_)));
  }
  else {
    expectSource = goog.string.format(
        '(abs(%s - %s) <= %s)',
        glslunit.Generator.getSourceCode(value),
        glslunit.Generator.formatFloat(/** @type {number} */(this.values_)),
        glslunit.Generator.formatFloat(this.epsilon_));
    if (this.operator_ == '!=') {
      expectSource = '!' + expectSource;
    }
  }
  return expectSource;
};


/**
 * Gets the AST node for testing the expectation given a value to test.
 * @param {!Object} value The AST for the value being tested.
 * @return {!Object} The AST for testing this expectation.
 */
glslunit.testing.ComparisonTester.prototype.getTestAstNode = function(
    value) {
  var expectSource;
  if (goog.isArray(this.values_)) {
    expectSource = this.getVectorTestSource_(value);
  } else {
    expectSource = this.getScalarTestSource_(value);
  }
  return glslunit.glsl.parser.parse(expectSource, 'assignment_expression');
};


/**
 * Sets the operation and values to test with.
 * @param {string} operator The operator to test with.
 * @param {!Array.<number>|number} values The values to test against.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 * @private
 */
glslunit.testing.ComparisonTester.prototype.setOperator_ = function(
    operator,
    values) {
  this.operator_ = operator;
  this.values_ = values;
  return this;
};


/**
 * Sets the vector comparison type to 'all'
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.all = function() {
  this.vectorComparisonType_ = 'all';
  return this;
};


/**
 * Sets the vector comparison type to 'any'
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.any = function() {
  this.vectorComparisonType_ = 'any';
  return this;
};


/**
 * Sets the allowable error.
 * @param {number} epsilon The allowable error when testing this expectation.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.withEpsilonOf = function(
    epsilon) {
  this.epsilon_ = Math.max(0, epsilon);
  return this;
};


/**
 * Sets the comparison type to less than.a
 * @param {!Array.<number>|number} values The value(s) to compare against.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.lessThan = function(values) {
  return this.setOperator_('<', values);
};


/**
 * Sets the comparison type to less than or equal to.
 * @param {!Array.<number>|number} values The value(s) to compare against.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.lessThanEqual = function(
    values) {
  return this.setOperator_('<=', values);
};


/**
 * Sets the comparison type to greater than.
 * @param {!Array.<number>|number} values The value(s) to compare against.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.greaterThan = function(values)
{
  return this.setOperator_('>', values);
};


/**
 * Sets the comparison type to greater than or equal to.
 * @param {!Array.<number>|number} values The value(s) to compare against.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.greaterThanEqual = function(
    values) {
  return this.setOperator_('>=', values);
};


/**
 * Sets the comparison type to equal to.
 * @param {!Array.<number>|number} values The value(s) to compare against.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.equal = function(values) {
  return this.setOperator_('==', values);
};


/**
 * Sets the comparison type to not equal to.
 * @param {!Array.<number>|number} values The value(s) to compare against.
 * @return {glslunit.testing.ComparisonTester} This ExpectationComparison.
 */
glslunit.testing.ComparisonTester.prototype.notEqual = function(values) {
  return this.setOperator_('!=', values);
};
