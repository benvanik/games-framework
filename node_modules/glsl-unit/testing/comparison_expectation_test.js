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
 * @fileoverview Test cases for ComparisionExpectation.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Executor');
goog.require('glslunit.Generator');
goog.require('glslunit.glsl.parser');
goog.require('glslunit.testing.ComparisonExpectation');
goog.require('glslunit.testing.ValueBeingTested');
goog.require('goog.testing.LooseMock');
goog.require('goog.testing.StrictMock');
goog.require('goog.testing.jsunit');



function testPass() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');

  var testValue = new goog.testing.LooseMock(glslunit.testing.ValueBeingTested);
  testValue.getValueAst().$returns(testAst);
  testValue.$replay();

  var testExecutor = new goog.testing.LooseMock(glslunit.Executor);
  testExecutor.extractValue(goog.testing.mockmatchers.isObject)
      .$does(function(extractAst) {
        assertEquals('!(abs(42.-66.)<=0.)',
                     glslunit.Generator.getSourceCode(extractAst));
        return 0.99;
      });
  testExecutor.$replay();

  var testComp = new glslunit.testing.ComparisonExpectation(testValue);
  testComp.getTest().notEqual(66);
  testComp.run(testExecutor);
  assertTrue(testComp.getTestPassed());
}

function testFail() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');

  var testValue = new goog.testing.LooseMock(glslunit.testing.ValueBeingTested);
  testValue.getValueAst().$returns(testAst).$times(3);
  testValue.$replay();

  var testExecutor = new goog.testing.StrictMock(glslunit.Executor);
  testExecutor.extractValue(goog.testing.mockmatchers.isObject)
      .$does(function(extractAst) {
        assertEquals('!(abs(42.-42.)<=0.)',
                     glslunit.Generator.getSourceCode(extractAst));
        return 0.0001;
      });
  testExecutor.extractValue(testAst, undefined).$returns(42);
  testExecutor.$replay();

  var testComp = new glslunit.testing.ComparisonExpectation(testValue);
  testComp.getTest().notEqual(42);
  testComp.run(testExecutor);
  assertFalse(testComp.getTestPassed());
  var failureString =
    'Expected 42. != 42 with allowable error of 0, was 42';
  assertEquals(failureString, testComp.getFailureString());
}

function testArrayFail() {
  var testAst = glslunit.glsl.parser.parse('foo',
                                           'assignment_expression');

  var testValue = new goog.testing.StrictMock(glslunit.testing.ValueBeingTested);
  testValue.getValueAst().$returns(testAst).$times(3);
  testValue.$replay();

  var testExecutor = new goog.testing.StrictMock(glslunit.Executor);
  testExecutor.extractValue(goog.testing.mockmatchers.isObject).
      $does(function(extractAst) {
        assertEquals('all(lessThanEqual(abs(foo-vec2(42.,24.)),vec2(0.,0.)))',
          glslunit.Generator.getSourceCode(extractAst));
        return 0;
      });
  testExecutor.extractValue(goog.testing.mockmatchers.isObject, undefined).
      $does(function(extractAst) {
        return 0.4;
      }).$times(2);
  testExecutor.$replay();

  var testComp = new glslunit.testing.ComparisonExpectation(testValue);
  testComp.getTest().equal([42., 24.]);
  testComp.run(testExecutor);
  assertFalse(testComp.getTestPassed());
  var failureString =
    'Expected foo == 42,24 with allowable error of 0, was 0.4,0.4';
  assertEquals(failureString, testComp.getFailureString());
}

function testMismatch() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');

  var testValue = new goog.testing.LooseMock(glslunit.testing.ValueBeingTested);
  testValue.getValueAst().$returns(testAst).$times(6);
  testValue.$replay();

  var testExecutor = new goog.testing.StrictMock(glslunit.Executor);
  testExecutor.extractValue(goog.testing.mockmatchers.isObject)
      .$does(function(extractAst) {
        assertEquals('!(abs(42.-42.)<=0.)',
                     glslunit.Generator.getSourceCode(extractAst));
        return glslunit.Executor.DecodeStatus.MISMATCH;
      });
  testExecutor.extractValue(testAst, 0).$returns(42);
  testExecutor.extractValue(testAst, 1).$returns(39);
  testExecutor.extractValue(testAst, 2).$returns(42);
  testExecutor.$replay();

  var testComp = new glslunit.testing.ComparisonExpectation(testValue);
  testComp.getTest().notEqual(42);
  testComp.run(testExecutor);
  assertFalse(testComp.getTestPassed());
  var failureString =
    'There was a mismatch between values at each test vertex.  This should ' +
    'not happen and usually indicates a driver bug.\n' +
    'Expected 42. != 42 with allowable error of 0\n' +
    '\tVertex 0 had value 42\n' +
    '\tVertex 1 had value 39\n' +
    '\tVertex 2 had value 42';
  assertEquals(failureString, testComp.getFailureString());
}

function testMismatchOnExtract() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');

  var testValue = new goog.testing.LooseMock(glslunit.testing.ValueBeingTested);
  testValue.getValueAst().$returns(testAst).$times(6);
  testValue.$replay();

  var testExecutor = new goog.testing.StrictMock(glslunit.Executor);
  testExecutor.extractValue(goog.testing.mockmatchers.isObject).
      $returns(0);
  testExecutor.extractValue(testAst, undefined).
      $returns(glslunit.Executor.DecodeStatus.MISMATCH);

  testExecutor.extractValue(testAst, 0).$returns(42);
  testExecutor.extractValue(testAst, 1).$returns(38.99899);
  testExecutor.extractValue(testAst, 2).$returns(42);
  testExecutor.$replay();

  var testComp = new glslunit.testing.ComparisonExpectation(testValue);
  testComp.getTest().notEqual(42);
  testComp.run(testExecutor);
  assertFalse(testComp.getTestPassed());
  var failureString =
    'There was a mismatch between values at each test vertex.  This should ' +
    'not happen and usually indicates a driver bug.\n' +
    'Expected 42. != 42 with allowable error of 0\n' +
    '\tVertex 0 had value 42\n' +
    '\tVertex 1 had value 39\n' +
    '\tVertex 2 had value 42';
  assertEquals(failureString, testComp.getFailureString());
}
