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

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.ASTVisitor');
goog.require('glslunit.Generator');
goog.require('glslunit.glsl.parser');
goog.require('goog.object');


/**
 * Test Transformer
 * @constructor
 * @extends {glslunit.ASTTransformer}
 */
glslunit.TestASTTransformer = function() {
  goog.base(this);
};
goog.inherits(glslunit.TestASTTransformer, glslunit.ASTTransformer);


/**
 * Transforms all binary nodes to have their operator become ^^.
 * @param {Object} node Node under test.
 * @return {Object} The transformed node.
 */
glslunit.TestASTTransformer.prototype.transformBinary = function(node) {
  var result = goog.object.clone(node);
  result.operator = glslunit.ASTTransformer.cloneNode(node.operator);
  result.operator.operator = '^^';
  return result;
};


/**
 * Strips out empty scopes
 * @param {Object} node Node under test.
 * @return {Object} The transformed node.
 */
glslunit.TestASTTransformer.prototype.transformScope = function(node) {
  if (node.statements.length == 0) {
    return null;
  }
  return node;
};


/**
 * Removes declartions of items named 'foobar'
 * @param {Object} node Node under test.
 * @return {Object} The transformed node.
 */
glslunit.TestASTTransformer.prototype.transformDeclaratorItem = function(node) {
  if (node.name.name == 'foobar') {
    return null;
  }
  return node;
};


function testTransformBinary() {
  var testNode = {
    type: 'root',
    statements: [
      {
        type: 'function_declaration',
        name: 'main',
        returnType: {
          type: 'type',
          name: 'void'
        },
        parameters: [],
        body: {
          type: 'scope',
          statements: [{
            type: 'return',
            value: {
              type: 'binary',
              operator: {
                type: 'operator',
                operator: '*'
              },
              left: {
                type: 'function_call',
                function_name: 'func',
                parameters: [{
                  type: 'int',
                  value: 2
                }]
              },
              right: {
                type: 'int',
                value: 4
              }
            }
          }]
        }
      }
    ]
  };
  var testTransformer = new glslunit.TestASTTransformer();
  var result = testTransformer.transformNode(testNode);
  assertNotEquals('The root node should not have been resused',
                  result,
                  testNode);
  assertEquals('returnType node should have been reused since none of its ' +
               'children changed.',
               result.statements[0].returnType,
               testNode.statements[0].returnType);
  assertEquals('Original node should not have been transformed',
               '*',
               testNode.statements[0].body.statements[0]
                   .value.operator.operator);
  assertEquals('Node should have been transformed',
               '^^',
               result.statements[0].body.statements[0]
                   .value.operator.operator);
  assertEquals('left of binary should have been reused',
               testNode.statements[0].body.statements[0].value.left,
               result.statements[0].body.statements[0].value.left);
  assertEquals('right of binary should have been reused',
               testNode.statements[0].body.statements[0].value.right,
               result.statements[0].body.statements[0].value.right);
}


function testArrayUntouched() {
  var testSource =
      'void main() {' +
      '  int x = 3 * 5;' +
      '  int y = 4 + 2;' +
      '  int z = 12;' +
      '}';
  var testAST = glslunit.glsl.parser.parse(testSource);
  var testTransformer = new glslunit.TestASTTransformer();
  var transformedAST = testTransformer.transformNode(testAST);
  assertTrue('Original source should not have been transformed',
             glslunit.Generator.getSourceCode(testAST).indexOf('^^') == -1);
  assertTrue('Transformed source should have been transformed',
             glslunit.Generator.getSourceCode(
                 transformedAST).indexOf('^^') != -1);
}

/**
 * Test Visitor
 * @constructor
 * @extends {glslunit.ASTVisitor}
 */
testVisitor = function() {
  goog.base(this);
  this.beforeBinaryCount = 0;
  this.afterBinaryCount = 0;
};
goog.inherits(testVisitor, glslunit.ASTVisitor);


/**
 * Counts the number of before visit calls to binary nodes
 * @param {Object} node Node under test.
 */
testVisitor.prototype.beforeVisitBinary = function(node) {
  this.beforeBinaryCount++;
};


/**
 * Counts the number of after visit calls to binary nodes
 * @param {Object} node Node under test.
 */
testVisitor.prototype.afterVisitBinary = function(node) {
  this.afterBinaryCount++;
};

function testMixin() {
  var testSource =
      'void main() {' +
      '  int x = 3 * 5;' +
      '  int y = 4 + 2;' +
      '  int z = 12;' +
      '}';
  var testAST = glslunit.glsl.parser.parse(testSource);
  var testTransformer = new glslunit.TestASTTransformer();
  var visitor = new testVisitor();
  testTransformer.mixinVisitor(visitor);
  var transformedAST = testTransformer.transformNode(testAST);
  assertEquals(2, visitor.beforeBinaryCount);
  assertEquals(2, visitor.afterBinaryCount);
}

function testDelete() {
  var testSource =
      'void main() {' +
      '  if (true) {' +
      '    int x, y, foobar;' +
      '    int z;' +
      '    int z = 12;' +
      '  } else {}' +
      '}';
  var expectedSource =
    'void main(){' +
    'if(true){' +
    'int x,y;' +
    'int z;' +
    'int z=12;' +
    '}' +
    '}';
  var testAST = glslunit.glsl.parser.parse(testSource);
  var testTransformer = new glslunit.TestASTTransformer();
  var transformedAST = testTransformer.transformNode(testAST);
  assertEquals(expectedSource,
               glslunit.Generator.getSourceCode(transformedAST));
}
