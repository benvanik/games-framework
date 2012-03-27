// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Description of this file.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.TypeAnnotator');

goog.require('glslunit.VariableScopeVisitor');



/**
 * @param {!Object} rootNode
 * @constructor
 * @extends {glslunit.VariableScopeVisitor}
 */
glslunit.TypeAnnotator = function(rootNode) {
  this.rootNode_ = rootNode;

  this.typeMap_ = {}''
};
goog.inherits(glslunit.TypeAnnotator, glslunit.VariableScopeVisitor);


glslunit.TypeAnnotator.prototype.visitIdentifier = function(node) {
  var declaration = this.getCurrentVariableMap()[node.name];
  var typeName = '';
  if (declaration) {
    if (declaration.type == 'parameter') {
      typeName = declaration.type_name;
    } else {
      typeName = declaration.typeAttribute.name;
      declaration = goog.array.find(declaration.declarators,
                                    function(elem, i, arr) {
        return elem.name.name == node.name;
      });
    }
    if (declaration.arraySize || declaration.isArray) {
      typeName += '[';
      typeName
    }
  }
}


/**
 * Stores the type of the input node
 * @param {!Object} node The node having its type annotated
 * @export
 */
glslunit.TypeAnnotator.prototype.visitUnary = function(node) {
  this.typeMap_.set(node.id, this.typeMap_.get(node.expression));
}


/**
 * Stores the type of the input node
 * @param {!Object} node The node having its type annotated
 * @protected
 */
glslunit.TypeAnnotator.prototype.visitValue = function(node) {
  this.typeMap_.set(node.id, node.type);
}


/**
 * Stores the type of the input node
 * @param {!Object} node The node having its type annotated
 * @export
 */
glslunit.TypeAnnotator.prototype.visitInt =
  glslunit.TypeAnnotator.prototype.visitBool;


/**
 * Stores the type of the input node
 * @param {!Object} node The node having its type annotated
 * @export
 */
glslunit.TypeAnnotator.prototype.visitFloat =
  glslunit.TypeAnnotator.prototype.visitValue;


/**
 * Stores the type of the input node
 * @param {!Object} node The node having its type annotated
 * @export
 */
glslunit.TypeAnnotator.prototype.visitInt =
  glslunit.TypeAnnotator.prototype.visitValue;
