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
 * @fileoverview AST Transformer that replaces attributes with constant values.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.ReplaceAttributeTransformer');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.Generator');
goog.require('glslunit.VariableScopeVisitor');
goog.require('glslunit.glsl.parser');
goog.require('goog.array');
goog.require('goog.object');

/**
 * Constructs a ReplaceAttributeTransformer.
 * @param {!Object.<string, Array.<number>>} replacementMap Map of attribute
 *     names to values to replace them with.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @export
 */
glslunit.ReplaceAttributeTransformer = function(replacementMap) {
  goog.base(this);

  /**
   * Variable Scope Visitor used to keep track of what variables are in scope.
   * @type {glslunit.VariableScopeVisitor}
   * @private
   */
  this.variableScope_ = new glslunit.VariableScopeVisitor({});

  /**
   * Map of attribute names to the value they should be replaced with.
   * @type {!Object.<string, Array.<number>>}
   * @private
   */
  this.replacementMap_ = replacementMap;

  /**
   * The current declarator being transformed by this transformer.
   * @type {Object}
   * @private
   */
  this.currentDeclarator_ = null;

  /**
   * A map of the variables currently in scope to their declaration.
   * @type {!Object}
   * @private
   */
  this.variablesInScope_ = {};

  /**
   * Whether or not identifiers should be replaced.
   * @type {boolean}
   * @private
   */
  this.replaceIdentifiers_ = true;

  this.mixinVisitor(this.variableScope_);
};
goog.inherits(glslunit.ReplaceAttributeTransformer, glslunit.ASTTransformer);


/**
 * Stores a declarator as the current declarator before it's transformed.
 * @param {!Object} node The node about to be transformed.
 * @export
 */
glslunit.ReplaceAttributeTransformer.prototype.beforeTransformDeclarator =
    function(node) {
  this.currentDeclarator_ = node;
  this.replaceIdentifiers_ = false;
};


/**
 * If all of the items in a declarator were removed, remove the declarator
 * @param {!Object} node The node being transformed.
 * @return {Object} If no transformation was performed, returns the same node
 *     as was passed in.  Otherwise, returns the transformed node.
 * @export
 */
glslunit.ReplaceAttributeTransformer.prototype.transformDeclarator =
    function(node) {
  if (!node.declarators || node.declarators.length == 0) {
    return null;
  }
  return node;
};


/**
 * Clears the local reference to the current declarator.
 * @param {!Object} origNode The node before being transformed.
 * @param {!Object} newNode The node after being transformed.
 * @export
 */
glslunit.ReplaceAttributeTransformer.prototype.afterTransformDeclarator =
    function(origNode, newNode) {
  this.currentDeclarator_ = null;
  this.replaceIdentifiers_ = true;
};


/**
 * If this declarator item is one of the ones we're replacing, remove it.
 * @param {!Object} node The node being transformed.
 * @return {Object} If no transformation was performed, returns the same node
 *     as was passed in.  Otherwise, returns the transformed node.
 * @export
 */
glslunit.ReplaceAttributeTransformer.prototype.transformDeclaratorItem =
    function(node) {
  if (this.currentDeclarator_ &&
      this.currentDeclarator_.typeAttribute.qualifier == 'attribute' &&
      goog.isDef(this.replacementMap_[node.name.name])) {
    return null;
  }
  if (node.initializer) {
    this.replaceIdentifiers_ = true;
    var newInitializer = this.transformNode(node.initializer);
    this.replaceIdentifiers_ = false;
    if (newInitializer != node.initializer) {
      node = glslunit.ASTTransformer.cloneNode(node);
      node.initializer = newInitializer;
    }
  }
  return node;
};


/**
 * After every declaration of a declartor item, we have to update our list of
 *     variables in scope.
 * @param {!Object} origNode The node before being transformed.
 * @param {!Object} newNode The node after being transformed.
 * @export
 */
glslunit.ReplaceAttributeTransformer.prototype.afterTransformDeclaratorItem =
    function(origNode, newNode) {
  this.variablesInScope_ = this.variableScope_.getCurrentScopeVariables();
};


/**
 * After every parameter of a declartor item, we have to update our list of
 *     variables in scope.
 * @param {!Object} origNode The node before being transformed.
 * @param {!Object} newNode The node after being transformed.
 * @export
 */
glslunit.ReplaceAttributeTransformer.prototype.beforeTransformScope =
    function(origNode, newNode) {
  this.variablesInScope_ = this.variableScope_.getCurrentScopeVariables();
};


/**
 * If we find an identifier reference to the attribute being removed, replace it
 *     with a constant expression.
 * @param {!Object} node The node being transformed.
 * @return {!Object} If no transformation was performed, returns the same node
 *     as was passed in.  Otherwise, returns the transformed node.
 * @export
 */
glslunit.ReplaceAttributeTransformer.prototype.transformIdentifier =
    function(node) {
  var replacement = this.replacementMap_[node.name];
  if (this.replaceIdentifiers_ &&
      goog.isDef(replacement)) {
    var declaration = this.variablesInScope_[node.name];
    if (declaration && declaration.typeAttribute &&
        declaration.typeAttribute.qualifier == 'attribute') {
      var conversionSource;
      var params = replacement.map(glslunit.Generator.formatFloat).join(',');
      var typeName =
        replacement.length == 1 ? 'float' : 'vec' + replacement.length;
      if (goog.DEBUG && typeName != declaration.typeAttribute.name) {
        throw new Error('Wrong Type!  Replacing ' +
            declaration.typeAttribute.name + ' with ' + typeName + ' for ' +
            'variable ' + node.name);
      }
      if (replacement.length == 1) {
        conversionSource = params;
      } else {
        conversionSource = 'vec' + replacement.length + '(' + params + ')';
      }
      return glslunit.glsl.parser.parse(conversionSource,
                                        'assignment_expression');
    }
  }
  return node;
};


/**
 * Helper static function for replacing attributes with constant values.
 * @param {string} source The source code of the shader to replace attributes.
 * @param {!Object} replacementMap The map of variable names to constant values.
 * @return {string} The new source code.
 */
glslunit.ReplaceAttributeTransformer.replaceAttributes =
    function(source, replacementMap) {
  var sourceAst = glslunit.glsl.parser.parse(source);
  var transformer = new glslunit.ReplaceAttributeTransformer(replacementMap);
  return glslunit.Generator.getSourceCode(transformer.transformNode(sourceAst));
};
