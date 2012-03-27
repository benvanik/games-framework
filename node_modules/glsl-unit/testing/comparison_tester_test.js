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
 * @fileoverview Test cases for ComparisonTester.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.glsl.parser');
goog.require('glslunit.testing.ComparisonTester');
goog.require('goog.testing.jsunit');



function testScalarNotEqual() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');
  var testOperation = new glslunit.testing.ComparisonTester();

  testOperation.notEqual(33).withEpsilonOf(3);
  assertEquals(33, testOperation.getValues());
  assertEquals('!(abs(42.-33.)<=3.)',
               glslunit.Generator.getSourceCode(
                   testOperation.getTestAstNode(testAst)));
}

function testScalarEqual() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');
  var testOperation = new glslunit.testing.ComparisonTester();

  testOperation.equal(33).withEpsilonOf(3);
  assertEquals('abs(42.-33.)<=3.',
               glslunit.Generator.getSourceCode(
                   testOperation.getTestAstNode(testAst)));
}


function testScalarLessThan() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');
  var testOperation = new glslunit.testing.ComparisonTester();

  testOperation.lessThan(33).withEpsilonOf(12);
  assertEquals('42.-12.<33.',
               glslunit.Generator.getSourceCode(
                   testOperation.getTestAstNode(testAst)));
}

function testScalarGreaterThanEqual() {
  var testAst = glslunit.glsl.parser.parse('42.', 'assignment_expression');
  var testOperation = new glslunit.testing.ComparisonTester();

  testOperation.greaterThanEqual(33).withEpsilonOf(12);
  assertEquals('42.+12.>=33.',
               glslunit.Generator.getSourceCode(
                   testOperation.getTestAstNode(testAst)));
}


function testVectorNotEqual() {
  var testAst = glslunit.glsl.parser.parse('vec2(42., 33.)',
                                           'assignment_expression');
  var testOperation = new glslunit.testing.ComparisonTester();

  testOperation.notEqual([55, 21]).withEpsilonOf(1);

  assertEquals('!=', testOperation.getOperator());
  assertEquals(1, testOperation.getEpsilon());
  assertTrue(goog.array.equals([55, 21], testOperation.getValues()));
  assertEquals('!all(lessThanEqual(abs(vec2(42.,33.)-vec2(55.,21.)),' +
                                  'vec2(1.,1.)))',
               glslunit.Generator.getSourceCode(
               testOperation.getTestAstNode(testAst)));
}


function testVectorEqual() {
  var testAst = glslunit.glsl.parser.parse('vec2(42., 33.)',
                                           'assignment_expression');
  var testOperation = new glslunit.testing.ComparisonTester();

  testOperation.any().equal([55, 21]).withEpsilonOf(1);
  assertEquals('any(lessThanEqual(abs(vec2(42.,33.)-vec2(55.,21.)),' +
                                  'vec2(1.,1.)))',
               glslunit.Generator.getSourceCode(
                   testOperation.getTestAstNode(testAst)));
}


function testVectorLessThanEqual() {
  var testAst = glslunit.glsl.parser.parse('vec2(42., 33.)',
                                           'assignment_expression');
  var testOperation = new glslunit.testing.ComparisonTester();

  testOperation.all().lessThanEqual([55, 21]).withEpsilonOf(1);
  assertEquals('all(lessThanEqual(vec2(42.,33.)-1.,vec2(55.,21.)))',
               glslunit.Generator.getSourceCode(
                   testOperation.getTestAstNode(testAst)));
}
