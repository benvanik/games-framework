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
 * @fileoverview Testcases for the NodeInsertionTransformer.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.SpliceTransformer');
goog.require('glslunit.glsl.parser');
goog.require('goog.testing.jsunit');

/**
 * Tests that the SpliceTransformer adds nodes.
 */
function testInsertNode() {
  var testSource =
    'void heyItsAFunction() {}';

  var newSource = 'x++;';
  var newNode = glslunit.glsl.parser.parse(newSource, 'expression_statement');
  var testAST = glslunit.glsl.parser.parse(testSource);
  var target = testAST.statements[0].body;
  var oldId = newNode.id;
  var transformed = glslunit.SpliceTransformer.splice(
    testAST, target, 'statements', 0, 0, [newNode]);

  assertEquals("New Node shouldn't have been modified", oldId, newNode.id);
  assertNotEquals(testAST, transformed);
  assertEquals(1, transformed.statements[0].body.statements.length);
}

/**
 * Tests that the SpliceTransformer adds nodes.
 */
function testSpliceNode() {
  var testSource =
    'void heyItsAFunction(){y++;}';
  var expectedSource =
    'void heyItsAFunction(){x++;}';
  var newSource = 'x++;';
  var newNode = glslunit.glsl.parser.parse(newSource, 'expression_statement');
  var testAST = glslunit.glsl.parser.parse(testSource);
  var target = testAST.statements[0].body;
  var oldId = newNode.id;
  var transformed = glslunit.SpliceTransformer.splice(
    testAST, target, 'statements', 0, 1, [newNode]);

  assertEquals("New Node shouldn't have been modified", oldId, newNode.id);
  assertNotEquals(testAST, transformed);
  assertEquals(expectedSource, glslunit.Generator.getSourceCode(transformed));
}

/**
 * Tests that the SpliceTransformer throws on bad input.
 */
function testInsertThrows() {
  var testSource =
    'void heyItsAnotherFunction() {5+6;}';

  var newSource = 'x++;';
  var newNode = glslunit.glsl.parser.parse(newSource, 'expression_statement');
  var testAST = glslunit.glsl.parser.parse(testSource);
  var target = testAST.statements[0].body.statements[0];
  var threwException = false;
  try {
    var transformed = glslunit.SpliceTransformer.splice(
      testAST, target, 'operator', 0, 0, [newNode]);
  } catch (e) {
    threwException = true;
  }
  assertTrue(threwException);
}
