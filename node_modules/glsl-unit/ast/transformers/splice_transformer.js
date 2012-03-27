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
 * @fileoverview AST Transformer that splices nodes into/from an AST.  Use this
 *     to add/remove nodes from an AST.  This behaves similarly to the
 *     javascript splice function.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.SpliceTransformer');

goog.require('glslunit.ASTTransformer');
goog.require('goog.array');


/**
 * Constructs a SpliceTransformer.
 * @param {!Object} parentNode The node to be the parent of newNode.
 * @param {string} fieldName Name of the field in parentNode to splice.
 * @param {number} position Position into 'field' to insert newNode/remove
 *     nodes.
 * @param {number} elements The number of elements to remove.
 * @param {Array.<!Object>} newNodes AST node to be inserted.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @export
 */
glslunit.SpliceTransformer = function(parentNode, fieldName,
                                      position, elements, newNodes) {
  goog.base(this);
  /**
   * AST of the node to be inserted.
   * @type {Array.<!Object>}
   * @private
   */
  this.newNodes_ = newNodes;

  /**
   * The node to be the parent of newNode.
   * @type {!Object}
   * @private
   */
  this.parentNode_ = parentNode;

  /**
   * Field of parentNode to insert newNodes into/remove nodes.
   * @type {string}
   * @private
   */
  this.fieldName_ = fieldName;

  /**
   * Position into 'field' to insert newNodes.
   * @type {number}
   * @private
   */
  this.position_ = position;

  /**
   * The number of elements to remove.
   * @type {number}
   * @private
   */
  this.elements_ = elements;

  /**
   * List of nodes that were removed by this transformer.
   * @type {!Array.<!Object>}
   * @private
   */
  this.removedNodes_ = [];
};
goog.inherits(glslunit.SpliceTransformer, glslunit.ASTTransformer);


/**
 * Returns the list of nodes removed by the call to transformNode.
 * @return {!Array.<!Object>} The list of nodes that were removed by the call
 *     to transformNode.
 */
glslunit.SpliceTransformer.prototype.getRemovedNodes = function() {
  return this.removedNodes_;
};


/**
 * Checks to see if the node being transformed is the node we'd like to splice
 *     into and if so, performs the splice.
 * @param {!Object} node The node to possibly be transformed.
 * @return {!Object} If no transformation was performed, returns the same node
 *     as was passed in.  Otherwise, returns the transformed node.
 */
glslunit.SpliceTransformer.prototype.maybeSpliceNode = function(node) {
  if (node == this.parentNode_) {
    var result = glslunit.ASTTransformer.cloneNode(node);
    if (goog.isArray(result[this.fieldName_])) {
      var newNodes = this.newNodes_.map(glslunit.ASTTransformer.cloneNode);
      result[this.fieldName_] = goog.array.clone(result[this.fieldName_]);
      // Javascript-foo to call splice while using newNodes as the trailing
      // arguments.
      this.removedNodes_ = [].splice.apply(
        result[this.fieldName_],
        [this.position_, this.elements_].concat(newNodes));
      return result;
    } else {
      throw this.fieldName_ + ' wasn\'t an array.';
    }
  }
  return node;
};


/**
 * Override getTransformFunction to always return maybeSpliceNode.
 * @param {!Object} node The node currently being transformed.
 * @return {function(!Object):!Object} Always returns maybeSpliceNode.
 * @override
 */
glslunit.SpliceTransformer.prototype.getTransformFunction =
      function(node) {
  return this.maybeSpliceNode;
};


/**
 * Static helper function for splicing nodes.
 * @param {!Object} root The root node of the AST being transformed.
 * @param {!Object} parentNode The node to be the parent of newNodes and to have
 *     children removed.
 * @param {string} fieldName Name of the field in parentNode to splice.
 * @param {number} position Position into 'field' to insert newNode.
 * @param {number} elements The number of elements to remove.
 * @param {Array.<!Object>} newNodes AST node to be inserted.
 * @return {!Object} The transformed AST.
 */
glslunit.SpliceTransformer.splice = function(root, parentNode,
                                             fieldName, position,
                                             elements, newNodes) {
  var transformer = new glslunit.SpliceTransformer(parentNode, fieldName,
                                                   position, elements,
                                                   newNodes);
  return transformer.transformNode(root);
};
