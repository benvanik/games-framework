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
 * @fileoverview Node collector visits each node in the AST and stores the node
 *     if it passes a filtering function.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.NodeCollector');

goog.require('glslunit.ASTVisitor');

/**
 * Constructs a NodeCollector
 * @param {function(!Object):boolean} filterFunction Function used to filter out
 *     which nodes to store.  Should take in an AST node and return true if we
 *     should store this node, false otherwise.
 * @constructor
 * @extends {glslunit.ASTVisitor}
 */
glslunit.NodeCollector = function(filterFunction) {
  goog.base(this);

  /**
   * The list of nodes collected by the call to visitNode
   * @type {!Array.<!Object>}
   * @private
   */
  this.collectedNodes_ = [];

  /**
   * The stack of parent nodes.
   * @type {!Array.<!Object>}
   * @private
   */
  this.nodeStack_ = [];

  /**
   * Function used to filter out nodes being stored.  The first argument is the
   * node being tested, the second argument is the current stack of nodes,
   * excluding the current node being tested.
   * @type {function(!Object,Array.<!Object>=):boolean}
   * @private
   */
  this.filterFunction_ = filterFunction;
};
goog.inherits(glslunit.NodeCollector, glslunit.ASTVisitor);


/**
 * Looks at a node and collects it if it passes the filterFunction.
 * @param {!Object} node The node to possibly collect.
 * @private
 */
glslunit.NodeCollector.prototype.maybeCollectNode_ = function(node) {
  if (this.filterFunction_(node, this.nodeStack_.slice(0, -1))) {
    this.collectedNodes_.push(node);
  }
  this.genericVisitor(node);
};


/**
 * Gets the collected nodes.
 * @return {!Array.<!Object>} The list of nodes collected during visiting the
 *     AST passed into visitNode.
 */
glslunit.NodeCollector.prototype.getCollectedNodes = function() {
  return this.collectedNodes_;
};


/**
 * Overrides the beforeVisit function to always push the current node
 * @param {!Object} node The node about to be visited.
 * @return {function(!Object)} A function to push the current node on the stack.
 * @override
 */
glslunit.NodeCollector.prototype.getBeforeVisitFunction = function(node) {
  return goog.bind(Array.prototype.push, this.nodeStack_);
};


/**
 * Overrides the beforeVisit function to always push the current node
 * @param {!Object} node The node about to be visited.
 * @return {function(!Object)} A function to push the current node on the stack.
 * @override
 */
glslunit.NodeCollector.prototype.getAfterVisitFunction = function(node) {
  return goog.bind(Array.prototype.pop, this.nodeStack_);
};


/**
 * Overrides the visitor to always call maybeCollectNode for it's visit
 *     function.
 * @param {!Object} node The node currently being visited.
 * @return {function(!Object)} Always returns this.maybeCollectNode_.
 * @override
 */
glslunit.NodeCollector.prototype.getVisitFunction = function(node) {
  return this.maybeCollectNode_;
};


/**
 * Helper static function to collect nodes.
 * @param {!Object} root The root of the AST to collect nodes from.
 * @param {function(!Object):boolean} filterFunction The function used to filter
 *     nodes.
 * @return {!Array.<!Object>} The list of nodes collected.
 */
glslunit.NodeCollector.collectNodes = function(root, filterFunction) {
  var collector = new glslunit.NodeCollector(filterFunction);
  collector.visitNode(root);
  return collector.getCollectedNodes();
};
