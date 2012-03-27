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
 * @fileoverview Base class for transformers of the GLSL AST.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.ASTTransformer');

goog.require('glslunit.ASTVisitor');
goog.require('glslunit.utils');
goog.require('goog.array');
goog.require('goog.object');



/**
 * Base class for transforming the GLSL AST.
 *
 * Nodes will be transformed with a post-Order traversal.  Derived classes may
 * override specific transform functions, but aren't obligated to override all
 * of them.  Any overridden transform functions should be marked with @export.
 * By the time the overridden transform function is called, all of the node's
 * children will have been transformed (if required).  If the overridden
 * transform function is going to transform the node, it is required to make a
 * shallow copy of the node using
 * {@code glslunit.ASTTransformer.cloneNode}, modify the copy and
 * return it instead of modifying the node itself.
 *
 * @constructor
 */
glslunit.ASTTransformer = function() {
  /**
   * Visitors to mix in with this transformer.
   * @type {Array.<glslunit.ASTVisitor>}
   * @private
   */
  this.mixed_in_visitors_ = [];
};


/**
 * The next Id to use when creating new nodes.  All nodes created by
 * transformers will have negative IDs, so nextId_ should count downwards.
 * @type {number}
 * @private
 */
glslunit.ASTTransformer.nextId_ = -1;

/**
 * Helper function to get the next ID to assign to new nodes.
 * @return {number} The next ID to assign to node.
 */
glslunit.ASTTransformer.getNextId = function() {
  return glslunit.ASTTransformer.nextId_--;
};


/**
 * Creates a shallow Clone of an AST node and updates its ID to the next
 *     available ID.
 * @param {!Object} node The node to be cloned.
 * @return {!Object} The cloned node.
 * @protected
 */
glslunit.ASTTransformer.cloneNode = function(node) {
  var result = goog.object.clone(node);
  result.id = glslunit.ASTTransformer.getNextId();
  return result;
};


/**
 * Mixes in a visitor with this transformer.  Mixed in visitors will have their
 *     beforeVisit and afterVisit functions called with this transformer's
 *     beforeTransform and afterTransform functions.
 * @param {glslunit.ASTVisitor} visitor The visitor to mix in with this
 *     transformer.
 */
glslunit.ASTTransformer.prototype.mixinVisitor = function(visitor) {
  this.mixed_in_visitors_.push(visitor);
};


/**
 * Gets a function to transform a node.  This function can be overridden by
 *     subclasses to transform multiple node types with the same function.
 * @param {!Object} node The node who's transformation function we're finding.
 * @return {function(!Object, Object=): !Object} The transformation function.
 */
glslunit.ASTTransformer.prototype.getTransformFunction = function(node) {
  return this['transform' + glslunit.utils.getFunctionSuffix(node.type)];
};


/**
 * Mixes in the visit calls and the transform calls to be called before and
 *     after transforming a node.
 * @param {!Object} node The node to be transformed and visited.
 * @param {string} prefix The prefix for the transform function to be called.
 * @param {function(!glslunit.ASTVisitor):function(!Object)} getVisitorFn
 *     A function that gets the appropriate visit function to be mixed in with
 *     the transform calls.
 * @return {function(!Object)|function(!Object,!Object)} A function that calls
 *     all of the appropriate visit functions as well as the appropriate
 *     functions on the transformer.
 * @private
 */
glslunit.ASTTransformer.prototype.mixinVisitFunctions_ =
    function(node, prefix, getVisitorFn) {
  var transformFunction =
    this[prefix + glslunit.utils.getFunctionSuffix(node.type)];
  return goog.bind(function(origNode) {
    goog.array.forEach(this.mixed_in_visitors_, function(visitor) {
      var visitFunction = getVisitorFn(visitor).apply(visitor, [origNode]);
      if (visitFunction) {
        visitFunction.apply(visitor, [origNode]);
      }
    });
    if (transformFunction) {
      transformFunction.apply(this, [origNode]);
    }
  }, this);
};


/**
 * Gets a function to be called before transforming a node.  This function will
 *     be called before transforming a node's children and the node.
 * @param {!Object} node The node who's transformation function we're finding.
 * @return {function(!Object)} The function to call before transform.
 */
glslunit.ASTTransformer.prototype.getBeforeTransformFunction = function(node) {
  return this.mixinVisitFunctions_(node, 'beforeTransform', function(visitor) {
    return visitor.getBeforeVisitFunction;
  });
};


/**
 * Gets a a function to be called after a node is finished being transformed.
 *     This function should take in two nodes, first the original node and
 *     second the transformed node.
 * @param {!Object} node The node who's transformation function we're finding.
 * @return {function(!Object, !Object)} The transformation function.
 */
glslunit.ASTTransformer.prototype.getAfterTransformFunction = function(node) {
  return this.mixinVisitFunctions_(node, 'afterTransform', function(visitor) {
    return visitor.getAfterVisitFunction;
  });
};


/**
 * Transforms a node's children first and then the node itself.
 * @param {!Object} node The node to be transformed.
 * @return {!Object} If no transformation was performed, returns the same node
 *     as was passed in.  Otherwise, returns the transformed node.
 */
glslunit.ASTTransformer.prototype.transformNode = function(node) {
  var childrenModified = false;
  var beforeTransform = this.getBeforeTransformFunction(node);
  if (beforeTransform) {
    beforeTransform.apply(this, [node]);
  }
  // Take a shallow clone of node to be modified if children change.
  var result = glslunit.ASTTransformer.cloneNode(node);
  // First, transform any children node has.
  for (var field in node) {
    var item = node[field];
    if (goog.isArray(item)) {
      result[field] = [];
      for (var i = 0; i < item.length; i++) {
        var n = item[i];
        var newNode = this.transformNode(n);
        if (newNode != n) {
          childrenModified = true;
        }
        if (newNode != null) {
          // If the transformation returned an array instead of a single node,
          // we want to inline all of those nodes
          Array.prototype.push.apply(result[field],
                                     goog.isArray(newNode) ? newNode :
                                                             [newNode]);
        }
      }
    } else if (item && item.type) {
      var newNode = this.transformNode(item);
      if (newNode != item) {
        childrenModified = true;
        if (newNode != null) {
          result[field] = newNode;
        } else {
          // If we got back null, delete the element.
          delete result[field];
        }
      }
    }
  }
  var transformFunction = this.getTransformFunction(node);
  // If no children changed, re-use node, otherwise use the working result.
  result = childrenModified ? result : node;
  if (transformFunction) {
    result = transformFunction.apply(this, [result, node]);
  }
  var afterTransform = this.getAfterTransformFunction(node);
  if (afterTransform) {
    afterTransform.apply(this, [node, result]);
  }
  return result;
};
