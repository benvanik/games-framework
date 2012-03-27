// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Optimizer that removes unnecessary braces around.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.BraceReducer');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.CallGraphVisitor');
goog.require('glslunit.Generator');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('goog.array');



/**
 * Optimizer that removes unnecessary braces from glsl code.  For example:
 * if(foo==bar){return;} will become if(foo==bar)return;
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @implements {glslunit.compiler.CompilerStep}
 */
glslunit.compiler.BraceReducer = function() {
  goog.base(this);
};
goog.inherits(glslunit.compiler.BraceReducer,
              glslunit.ASTTransformer);


/**
 * If the field specified in fieldName for the input node is a scope and that
 * scope only has one statement, convert the scope into a single statement.
 * @param {!Object} node The node with the body to possibly transform.
 * @param {string} fieldName The name of the field to possibly convert from a
 * scope to a statement.
 * @return {!Object} The transformed node.
 * @private
 */
glslunit.compiler.BraceReducer.maybeConvertScopeToStatement_ =
    function(node, fieldName) {
  var bodyNode = node[fieldName];
  var result = node;
  if (bodyNode && bodyNode.type == 'scope' && bodyNode.statements.length == 1) {
    result = glslunit.ASTTransformer.cloneNode(node);
    result[fieldName] = bodyNode.statements[0];
  }
  return result;
};


/**
 * Removes any unnecessary braces from an if statement or its else body.
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @export
 */
glslunit.compiler.BraceReducer.prototype.transformIfStatement = function(node) {
  var result = glslunit.compiler.BraceReducer.maybeConvertScopeToStatement_(
      node, 'body');
  return glslunit.compiler.BraceReducer.maybeConvertScopeToStatement_(
      result, 'elseBody');
};


/**
 * Removes any unnecessary braces from a while statement.
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @export
 */
glslunit.compiler.BraceReducer.prototype.transformWhileStatement =
    function(node) {
  return glslunit.compiler.BraceReducer.maybeConvertScopeToStatement_(
      node, 'body');
};


/**
 * Removes any unnecessary braces from a do statement.
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @export
 */
glslunit.compiler.BraceReducer.prototype.transformDoStatement =
    function(node) {
  return glslunit.compiler.BraceReducer.maybeConvertScopeToStatement_(
      node, 'body');
};


/**
 * Removes any unnecessary braces from a for statement.
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @export
 */
glslunit.compiler.BraceReducer.prototype.transformForStatement =
    function(node) {
  return glslunit.compiler.BraceReducer.maybeConvertScopeToStatement_(
      node, 'body');
};


/**
 * The name of this compilation step.
 * @type {string}
 * @const
 */
glslunit.compiler.BraceReducer.NAME = 'BraceReducer';


/** @override */
glslunit.compiler.BraceReducer.prototype.getName = function() {
  return glslunit.compiler.BraceReducer.NAME;
};


/** @override */
glslunit.compiler.BraceReducer.prototype.getDependencies =
    function() {
  return [];
};


/** @override */
glslunit.compiler.BraceReducer.prototype.performStep =
    function(stepOutputMap, shaderProgram) {
  var vertexTransformer = new glslunit.compiler.BraceReducer();
  var fragmentTransformer = new glslunit.compiler.BraceReducer();
  shaderProgram.vertexAst =
      vertexTransformer.transformNode(shaderProgram.vertexAst);
  shaderProgram.fragmentAst =
      fragmentTransformer.transformNode(shaderProgram.fragmentAst);
  return [];
};
