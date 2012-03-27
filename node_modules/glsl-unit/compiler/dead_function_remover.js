// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Optimizer that removes dead functions.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.DeadFunctionRemover');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.CallGraphVisitor');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('goog.array');



/**
 * Optimizer removes dead functions.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @implements {glslunit.compiler.CompilerStep}
 */
glslunit.compiler.DeadFunctionRemover = function() {
  goog.base(this);

  /**
   * Map from function name to whether or not it is alive.
   * @type {Object.<string, boolean>}
   * @private
   */
  this.functionAlive_ = {};
};
goog.inherits(glslunit.compiler.DeadFunctionRemover,
              glslunit.ASTTransformer);


/**
 * Before visiting the root node of the AST, we create a map of function name
 * to whether or not that function is alive.
 * @param {!Object} node The root node for the AST to transform.
 * @export
 */
glslunit.compiler.DeadFunctionRemover.prototype.beforeTransformRoot =
      function(node) {
  var callGraph = glslunit.CallGraphVisitor.getCallGraph(node);
  this.functionAlive_ = {};
  for (var functionName in callGraph) {
    this.functionAlive_[functionName] = false;
  }
  this.markAlive_('main', callGraph);
  this.markAlive_(glslunit.CallGraphVisitor.ROOT_NAME, callGraph);
};


/**
 * Helper function to mark a function and all of it's children as alive.
 * @param {string} functionName The name of the function to mark as alive.
 * @param {Object.<string, Array.<string>>} callGraph Map of a function name to
 *     all of the functions it calls.
 * @private
 */
glslunit.compiler.DeadFunctionRemover.prototype.markAlive_ =
    function(functionName, callGraph) {
  if (functionName in this.functionAlive_ &&
      !this.functionAlive_[functionName]) {
    this.functionAlive_[functionName] = true;
    goog.array.forEach(callGraph[functionName], function(childFunction) {
      this.markAlive_(childFunction, callGraph);
    }, this);
  }
};


/**
 * Transforms a function declaration by removing any unused declarations.
 * @param {!Object} node The node to be transformed.
 * @return {Object} The original function declaration if this function is still
 *     needed, null otherwise so the function will get removed.
 * @export
 */
glslunit.compiler.DeadFunctionRemover.prototype.transformFunctionDeclaration =
      function(node) {
  // If the function is not alive, return null to remove it.
  if (!this.functionAlive_[node.name]) {
    return null;
  } else {
    return node;
  }
};


/**
 * Transforms a function prototype by removing any unused prototypes.
 * @param {!Object} node The node to be transformed.
 * @return {Object} The original function prototype if this function is still
 *     needed, null otherwise so the function will get removed.
 * @export
 */
glslunit.compiler.DeadFunctionRemover.prototype.transformFunctionPrototype =
    glslunit.compiler.DeadFunctionRemover.
        prototype.transformFunctionDeclaration;


/**
 * The name of this compilation step.
 * @type {string}
 * @const
 */
glslunit.compiler.DeadFunctionRemover.NAME = 'DeadFunctionRemover';


/** @override */
glslunit.compiler.DeadFunctionRemover.prototype.getName = function() {
  return glslunit.compiler.DeadFunctionRemover.NAME;
};


/** @override */
glslunit.compiler.DeadFunctionRemover.prototype.getDependencies =
    function() {
  return [];
};


/** @override */
glslunit.compiler.DeadFunctionRemover.prototype.performStep =
    function(stepOutputMap, shaderProgram) {
  var vertexTransformer = new glslunit.compiler.DeadFunctionRemover();
  var fragmentTransformer = new glslunit.compiler.DeadFunctionRemover();
  shaderProgram.vertexAst =
      vertexTransformer.transformNode(shaderProgram.vertexAst);
  shaderProgram.fragmentAst =
      fragmentTransformer.transformNode(shaderProgram.fragmentAst);
  return [];
};
