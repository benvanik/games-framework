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
 * @fileoverview AST Transformer that renames functions.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.FunctionRenameTransformer');

goog.require('glslunit.ASTTransformer');
goog.require('goog.array');
goog.require('goog.object');



/**
 * Constructs a FunctionRenameTransformer.
 * @param {!Object} targetPrototype AST of the function prototype targeted for
 *    replacement.
 * @param {string} newName The new name for the function.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @export
 */
glslunit.FunctionRenameTransformer = function(targetPrototype, newName) {
  goog.base(this);

  /**
   * AST of the function prototype targeted for replacement.
   * @type {!Object}
   * @private
   */
  this.targetPrototype_ = targetPrototype;

  /**
   * The new name to replace instances of targetPrototype with.
   * @type {string}
   * @private
   */
  this.newName_ = newName;
};
goog.inherits(glslunit.FunctionRenameTransformer, glslunit.ASTTransformer);


/**
 * Compares a function declaration or prototype node to a function prototype
 *     node and returns true if they are the same function, false otherwise.
 * @param {!Object} node The function declaration or prototype node be compared
 *     with prototype.
 * @param {!Object} functionPrototype The prototype node to compare against.
 * @return {boolean} True if prototype and node refer to the same function,
 *     false otherwise.
 */
glslunit.FunctionRenameTransformer.functionPrototypeEquals =
    function(node, functionPrototype) {
  if (goog.array.equals(node.parameters,functionPrototype.parameters,
                        function(a, b) {
                          return a.type_name == b.type_name;
                        }) &&
      node.name == functionPrototype.name &&
      node.returnType.name == functionPrototype.returnType.name) {
    return true;
  }
  return false;
};


/**
 * Transforms a function declaration by renaming it to the newName passed in the
 * constructor if it matches the targetPrototype.
 * @param {!Object} node The node to possibly transform.
 * @return {!Object} The transformed node if a transform was performed,
 *     otherwise returns the input node unmodified.
 * @export
 */
glslunit.FunctionRenameTransformer.prototype.transformFunctionDeclaration =
    function(node) {
  var result = node;
  if (glslunit.FunctionRenameTransformer.functionPrototypeEquals(
      node,
      this.targetPrototype_)) {
    result = glslunit.ASTTransformer.cloneNode(node);
    result.name = this.newName_;
  }
  return result;
};


/**
 * Transforms a function prototype by renaming it to the newName passed in the
 * constructor if it matches the targetPrototype.
 * We simply assign transformFunctionPrototype to transformFunctionDeclaration
 * because transformFunctionDeclaration doesn't touch the node's body, and thus
 * is valid for transforming the prototype as well.
 * @param {!Object} node The node to possibly transform.
 * @return {!Object} The transformed node if a transform was performed,
 *     otherwise returns the input node unmodified.
 * @export
 */
glslunit.FunctionRenameTransformer.prototype.transformFunctionPrototype =
  glslunit.FunctionRenameTransformer.prototype.transformFunctionDeclaration;


/**
 * Transforms a function call by calling the method newName passed in the
 * constructor instead if it matches the targetPrototype.
 * @param {!Object} node The node to possibly transform.
 * @return {!Object} The transformed node if a transform was performed,
 *     otherwise returns the input node unmodified.
 * @export
 */
glslunit.FunctionRenameTransformer.prototype.transformFunctionCall =
    function(node) {
  // TODO(rowillia): Use type inference to ensure that we are renaming the
  // correct overload.
  var result = node;
  if (node.function_name == this.targetPrototype_.name &&
      node.parameters.length == this.targetPrototype_.parameters.length) {
    result = glslunit.ASTTransformer.cloneNode(node);
    result.function_name = this.newName_;
  }
  return result;
};
