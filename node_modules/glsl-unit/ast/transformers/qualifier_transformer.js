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
 * @fileoverview AST Transformer changes the qualifier on type nodes from an old
 *     qualifier type to a new qualifier type.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.QualifierTransformer');

goog.require('glslunit.ASTTransformer');



/**
 * Constructs a QualifierTransformer.
 * @param {string} oldQualifier The name of the qualifier being targeted for
 *     transformation.
 * @param {string} newQualifier The name of the type qualifier to change
 *     targeted nodes qualifier to.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @export
 */
glslunit.QualifierTransformer = function(oldQualifier, newQualifier) {
  goog.base(this);

  /**
   * The name of the qualifier being targeted for transformation.
   * @type {string}
   * @private
   */
  this.oldQualifier_ = oldQualifier;

  /**
   * The name of the type qualifier to change targeted nodes qualifier to.
   * @type {string}
   * @private
   */
  this.newQualifier_ = newQualifier;

  /**
   * List of declarator nodes that were transformed by this transformer.
   *     This list will contain only the new nodes, not the original nodes.
   * @type {Array.<!Object>}
   * @private
   */
  this.transformedList_ = [];
};
goog.inherits(glslunit.QualifierTransformer, glslunit.ASTTransformer);


/**
 * Transforms a type node by changing it's qualifier type.
 * @param {!Object} node The node to possibly transform it's qualifer type.
 * @return {!Object} If the node was transformed, it returns the transformed
 *     node.  Otherwise, returns the original node passed in.
 * @export
 */
glslunit.QualifierTransformer.prototype.transformType = function(node) {
  if (node.qualifier == this.oldQualifier_) {
    var result = glslunit.ASTTransformer.cloneNode(node);
    result.qualifier = this.newQualifier_;
    return result;
  }
  return node;
};
