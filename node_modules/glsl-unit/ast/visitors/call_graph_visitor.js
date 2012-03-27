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
 * @fileoverview CallGraphVisitor generates a call graph for an AST.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.CallGraphVisitor');

goog.require('glslunit.ASTVisitor');



/**
 * Constructs a CallGraphVisitor
 * @constructor
 * @extends {glslunit.ASTVisitor}
 */
glslunit.CallGraphVisitor = function() {
  goog.base(this);

  /**
   * A map of function names to the list of functions calls that function makes.
   * @type {Object.<string, Array.<string>>}
   * @private
   */
  this.callGraph_ = {};

  // We initialize the entry for the root node to an empty array.  We need an
  // entry for the root node for functions that are called within the global
  // scope, e.g. initalizing a global variable to a vector.
  this.callGraph_[glslunit.CallGraphVisitor.ROOT_NAME] = [];

  /**
   * The name of the function currently being visited.
   * @type {string}
   * @private
   */
  this.currentFunctionName_ = glslunit.CallGraphVisitor.ROOT_NAME;
};
goog.inherits(glslunit.CallGraphVisitor, glslunit.ASTVisitor);


/**
 * The name assigned to the root node of the call tree.  We use a symbol that
 * would be an invalid function name to avoid collisions.
 * @type {string}
 */
glslunit.CallGraphVisitor.ROOT_NAME = '#';


/**
 * Stores the current function name before visiting a function declaration.
 * @param {!Object} node The Function declaration node.
 * @export
 */
glslunit.CallGraphVisitor.prototype.beforeVisitFunctionDeclaration =
    function(node) {
  // We check for the existence of node.name in the call graph before creating a
  // new empty list because currently, we're not differentiating between
  // overloads.  In the future, we can de-duplicate override names.
  if (!(node.name in this.callGraph_)) {
    this.callGraph_[node.name] = [];
  }
  this.currentFunctionName_ = node.name;
};


/**
 * Clears he current function name.
 * @param {!Object} node The Function declaration node.
 * @export
 */
glslunit.CallGraphVisitor.prototype.afterVisitFunctionDeclaration =
    function(node) {
  this.currentFunctionName_ = glslunit.CallGraphVisitor.ROOT_NAME;
};


/**
 * Visits a function call and notes this function has been called by the current
 * function.
 * @param {!Object} node The Function call node.
 * @export
 */
glslunit.CallGraphVisitor.prototype.visitFunctionCall = function(node) {
  this.callGraph_[this.currentFunctionName_].push(node.function_name);
  this.genericVisitor(node);
};


/**
 * Helper static function to create a call graph.
 * @param {!Object} root The root of the AST to create a call graph of.
 * @return {Object.<string, Array.<string>>} A map of function names to the list
 *     of functions calls that function makes.
 */
glslunit.CallGraphVisitor.getCallGraph = function(root) {
  var visitor = new glslunit.CallGraphVisitor();
  visitor.visitNode(root);
  return visitor.callGraph_;
};
