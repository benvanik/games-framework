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

goog.require('glslunit.ASTVisitor');
goog.require('goog.structs.Set');


/**
 * Test Visitor
 * @constructor
 * @extends {glslunit.ASTVisitor}
 */
glslunit.TestASTVisitor = function() {
  /**
   * @type {goog.structs.Set} The collection of Int nodes found.
   */
   this.nodes_found = new goog.structs.Set();
};
goog.inherits(glslunit.TestASTVisitor, glslunit.ASTVisitor);


/**
 * Tracks which integers were found in the AST.
 * @param {Object} node Node to be visited.
 */
glslunit.TestASTVisitor.prototype.visitInt = function(node) {
  this.nodes_found.add(node.value);
};


function testFindInts() {
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
  var testVisitor = new glslunit.TestASTVisitor();
  testVisitor.visitNode(testNode);
  assertTrue(testVisitor.nodes_found.contains(2));
  assertTrue(testVisitor.nodes_found.contains(4));
}
