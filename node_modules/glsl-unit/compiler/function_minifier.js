// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Optimizer that minimizes the length of all function names.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.FunctionMinifier');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.NameGenerator');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.compiler.VariableMinifier');



/**
 * Optimizer that reduces the size of all function calls.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @implements {glslunit.compiler.CompilerStep}
 */
glslunit.compiler.FunctionMinifier = function() {
  goog.base(this);

  /**
   * The name generator.
   * @type {glslunit.compiler.NameGenerator}
   * @private
   */
  this.nameGenerator_ = new glslunit.compiler.NameGenerator();
};
goog.inherits(glslunit.compiler.FunctionMinifier, glslunit.ASTTransformer);


/**
 * Set of global functions to never rename.
 * @type {!Object.<string, boolean>}
 * @const
 * @private
 */
glslunit.compiler.FunctionMinifier.globalFunctions_ =
    {'main': true};


/**
 * Collects all function declarations and generates a shorter name for them
 *     before transforming them.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.FunctionMinifier.prototype.
    beforeTransformFunctionDeclaration = function(node) {
  if (!(node.name in glslunit.compiler.FunctionMinifier.globalFunctions_)) {
    this.nameGenerator_.shortenSymbol(node.name);
  }
};


/**
 * Renames all function declarations to their short name.
 * @param {!Object} node The node to to rename.
 * @return {!Object} The renamed node.
 * @export
 */
glslunit.compiler.FunctionMinifier.prototype.transformFunctionDeclaration =
    function(node) {
  var newName = this.nameGenerator_.getShortSymbol(node.name);
  if (newName != node.name) {
    var result = glslunit.ASTTransformer.cloneNode(node);
    result.name = newName;
    return result;
  }
  return node;
};


/**
 * Renames all function calls to their short name.
 * @param {!Object} node The node to to rename.
 * @return {!Object} The renamed node.
 * @export
 */
glslunit.compiler.FunctionMinifier.prototype.transformFunctionCall =
    function(node) {
  var newName = this.nameGenerator_.getShortSymbol(node.function_name);
  if (newName != node.function_name) {
    var result = glslunit.ASTTransformer.cloneNode(node);
    result.function_name = newName;
    return result;
  }
  return node;
};


/**
 * Collects all function prototypes and generates a shorter name for them
 *     before transforming them.  We just wire this to
 *     beforeTransformFunctionDeclaration since the code will be identical.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.FunctionMinifier.prototype.beforeTransformFunctionPrototype =
    glslunit.compiler.FunctionMinifier.prototype
      .beforeTransformFunctionDeclaration;


/**
 * Renames all function prototypes to their short name.
 * @param {!Object} node The node to to rename.  We just wire this to
 *     transformFunctionDeclaration since the code will be identical.
 * @return {!Object} The renamed node.
 * @export
 */
glslunit.compiler.FunctionMinifier.prototype.transformFunctionPrototype =
    glslunit.compiler.FunctionMinifier.prototype.transformFunctionDeclaration;


/**
 * The name of this compilation step.
 * @type {string}
 * @const
 */
glslunit.compiler.FunctionMinifier.NAME = 'Function Minifier';


/** @override */
glslunit.compiler.FunctionMinifier.prototype.getName = function() {
  return glslunit.compiler.FunctionMinifier.NAME;
};


/** @override */
glslunit.compiler.FunctionMinifier.prototype.getDependencies =
    function() {
  return [glslunit.compiler.VariableMinifier.NAME];
};


/** @override */
glslunit.compiler.FunctionMinifier.prototype.performStep =
    function(stepOutputMap, shaderProgram) {
  var maxVertexId = 0;
  var maxFragmentId = 0;
  if (glslunit.compiler.VariableMinifier.NAME in stepOutputMap) {
    maxVertexId =
      stepOutputMap[glslunit.compiler.VariableMinifier.NAME]['vertexMaxId'];
    maxFragmentId =
      stepOutputMap[glslunit.compiler.VariableMinifier.NAME]['fragmentMaxId'];
  }

  var vertexTransformer = new glslunit.compiler.FunctionMinifier();
  vertexTransformer.nameGenerator_.nextNameIndex = maxVertexId;

  var fragmentTransformer = new glslunit.compiler.FunctionMinifier();
  shaderProgram.vertexAst =
      vertexTransformer.transformNode(shaderProgram.vertexAst);
  fragmentTransformer.nameGenerator_.nextNameIndex = maxFragmentId;

  shaderProgram.fragmentAst =
      fragmentTransformer.transformNode(shaderProgram.fragmentAst);
  return [];
};
