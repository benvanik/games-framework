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
 * @fileoverview Test cases for the VertexExecutor.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.ASTVisitor');
goog.require('glslunit.Generator');
goog.require('glslunit.VertexExecutor');
goog.require('glslunit.glsl.parser');
goog.require('goog.testing.jsunit');

assignmentFinder = function(targetVar) {
  this.assignment = null;
  this.targetVar_ = targetVar;
};
goog.inherits(assignmentFinder, glslunit.ASTVisitor);


/**
 * Visits a binary node and if it's the '=' operator stores the value being
 * assigned to.
 * @param {Object} node A binary node to check for an assignment.
 * @export
 */
assignmentFinder.prototype.visitBinary = function(node) {
  if (node.operator.operator == '=' && node.left.name == this.targetVar_) {
    this.assignment = node.right;
  }
  this.genericVisitor(node);
};


/**
 * Tests that the fragment AST can be fetched and is correct.
 */
function testGetFragmentAst() {
  var testExecutor = new glslunit.VertexExecutor(null, null, null, null, null);
  var fragmentAst = testExecutor.getFragmentAst();
  var finder = new assignmentFinder('gl_FragColor');
  finder.visitNode(fragmentAst);
  assertNotNull('Couldn\'t find gl_FragColor assignment',
              finder.assignment);
}


/**
 * Tests that the vertex AST is properly instrumented with test code.
 */
function testGetVertexAst() {
  var testSource =
    'void main() {' +
    '  someValue = vec(1.0,2.0,3.0,4.0);' +
    '}';
  var extractionTargetSource = 'someValue[1]';
  var extractionAst = glslunit.glsl.parser.parse(extractionTargetSource,
                                                 'assignment_expression');
  var testAst = glslunit.glsl.parser.parse(testSource);
  var testExecutor = new glslunit.VertexExecutor(null, testAst, null,
                                                 null, null);

  var transformedAst = testExecutor.getVertexAst(extractionAst);
  assertEquals('Orignal shouldn\'t have been transformed',
               1, testAst.statements.length);

  assertEquals('Encoding code not added',
               'upper_mask', transformedAst.statements[2].name);

  var finder = new assignmentFinder('gl_Position');
  finder.visitNode(transformedAst);
  assertNotNull('Couldn\'t find gl_Position assignment',
              finder.assignment);

  finder = new assignmentFinder('vResultColor');
  finder.visitNode(transformedAst);
  assertEquals('Result set to wrong value',
               'encodeFloat',
               finder.assignment.function_name);
  assertEquals('Result set to wrong value',
               1,
               finder.assignment.parameters.length);
  assertEquals('Result set to wrong value',
               'function_call',
               finder.assignment.parameters[0].type);
  assertEquals('Result set to wrong value',
               'postfix',
               finder.assignment.parameters[0].parameters[0].type);
  var resultSource = glslunit.Generator.getSourceCode(transformedAst);
  assertNotEquals(-1, resultSource.search('__testMain'));
}

/**
 * Tests that the vertex AST is properly instrumented with test code.
 */
function testNoMainFunction() {
  var testSource = 'attribute vec4 someAttr;';
  var testAst = glslunit.glsl.parser.parse(testSource);
  var testExecutor = new glslunit.VertexExecutor(null, testAst, null,
    null, null);
  var extractionTargetSource = 'someAttr[1]';
  var extractionAst = glslunit.glsl.parser.parse(extractionTargetSource,
                                                 'assignment_expression');
  var transformedAst = testExecutor.getVertexAst(extractionAst);
  var resultSource = glslunit.Generator.getSourceCode(transformedAst);
  assertEquals(-1, resultSource.search('__testMain'));
}
