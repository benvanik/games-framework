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
 * @fileoverview AST Transformer that renames identifiers.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.IdentifierRenameTransformer');

goog.require('glslunit.ASTTransformer');
goog.require('goog.array');
goog.require('goog.object');



/**
 * Constructs a IdentifierRenameTransformer.
 * @param {string} oldName The name of the identifier to rename.
 * @param {string} newName The new name for the identifier.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @export
 */
glslunit.IdentifierRenameTransformer = function(oldName, newName) {
  goog.base(this);

  /**
   * The name of the identifier to rename.
   * @type {string}
   * @private
   */
  this.oldName_ = oldName;

  /**
   * The new name to replace instances of oldName with.
   * @type {string}
   * @private
   */
  this.newName_ = newName;
};
goog.inherits(glslunit.IdentifierRenameTransformer, glslunit.ASTTransformer);


/**
 * Possibly transforms an identifier node by changing it's name.
 * @param {!Object} node The node we're possibly transforming.
 * @return {!Object} If the node was transformed, it returns the transformed
 *     node.  Otherwise, returns the original node passed in.
 * @export
 */
glslunit.IdentifierRenameTransformer.prototype.transformIdentifier =
    function(node) {
  if (node.name == this.oldName_) {
    var result = glslunit.ASTTransformer.cloneNode(node);
    result.name = this.newName_;
    return result;
  }
  return node;
};


/**
 * Static helper function for renaming variables.
 * @param {!Object} root The root of the AST who's identifiers we want renamed.
 * @param {string} oldName The name of the identifier to rename.
 * @param {string} newName The new name for the identifier.
 * @return {!Object} The transformed AST.
 */
glslunit.IdentifierRenameTransformer.renameVariable =
    function(root, oldName, newName) {
  var transformer = new glslunit.IdentifierRenameTransformer(oldName, newName);
  return transformer.transformNode(root);
};
