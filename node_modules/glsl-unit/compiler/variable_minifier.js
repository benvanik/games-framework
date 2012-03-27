// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Optimizer that minimizes the length of variable names.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.VariableMinifier');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.NodeCollector');
goog.require('glslunit.VariableScopeVisitor');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.NameGenerator');
goog.require('glslunit.compiler.ShaderAttributeEntry');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.compiler.ShaderUniformEntry');
goog.require('glslunit.compiler.Utils');
goog.require('goog.object');



/**
 * Optimizer that reduces the size of variable and parameters.
 * @param {boolean} minifyPublicVariables Whether or not to minify public
 *     variables (uniforms and attributes).
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @implements {glslunit.compiler.CompilerStep}
 */
glslunit.compiler.VariableMinifier = function(minifyPublicVariables) {
  goog.base(this);

  /**
   * The stack of variables renamed.
   * @type {Array.<glslunit.compiler.NameGenerator>}
   * @private
   */
  this.variableStack_ = [];

  /**
   * The current name generator.
   * @type {glslunit.compiler.NameGenerator}
   * @private
   */
  this.currentNameGenerator_ = new glslunit.compiler.NameGenerator();

  /**
   * The declarator node for the current declarator item.
   * @type {Object}
   * @private
   */
  this.currentDeclaratorNode_ = null;

  /**
   * The maximum id ever used for a variable name.
   * @type {number}
   * @private
   */
  this.maxNameId_ = 0;

  /**
   * Whether or not to rename public variables (uniforms and attributes).
   * @type {boolean}
   * @private
   */
  this.minifyPublicVariables_ = minifyPublicVariables;

  /**
   * Set of node IDs that are declarators inside of struct definitions.
   * @type {Array.<boolean>}
   * @private
   */
  this.structDeclaratorNodes_ = [];
};
goog.inherits(glslunit.compiler.VariableMinifier, glslunit.ASTTransformer);


/**
 * Returns whether or not a declarator node should have its declarator items
 * renamed.
 * @param {Object} declaratorNode The shader program
 *     being optimized.
 * @return {boolean} True if the node should be renamed, false otherwise.
 * @private
 */
glslunit.compiler.VariableMinifier.prototype.shouldRenameNode_ =
    function(declaratorNode) {
  if (!declaratorNode) {
    return false;
  }
  var qualifier = declaratorNode.typeAttribute.qualifier;
  return ((this.minifyPublicVariables_ ||
              (qualifier != 'uniform' && qualifier != 'attribute')) &&
          !(declaratorNode.id in this.structDeclaratorNodes_));

};


/**
 * Sets the shader program we're optimizing.
 * @param {glslunit.compiler.ShaderProgram} shaderProgram The shader program
 *     being optimized.
 */
glslunit.compiler.VariableMinifier.prototype.setShaderProgram =
    function(shaderProgram) {
  this.shaderProgram_ = shaderProgram;
};


/**
 * Before transforming the root node, assign names for all global variables and
 *     parameters in the AST.  We do this first to prevent future conflicts with
 *     parameter names and globals.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.beforeTransformRoot =
    function(node) {
  this.structDeclaratorNodes_ =
      glslunit.compiler.Utils.getStructDeclarations(node);
  // We want to export the renaming of varyings and uniforms to the fragment
  // shader so the renaming is uniform across the two.  Therefore, we keep track
  // of two levels of globals, the ones that are to be exported, or the root
  // name generator, and the ones that are local to this program, which are
  // pushed onto the variable stack after the ones to be exported are.
  var localGlobals = [];
  var globals =
      glslunit.VariableScopeVisitor.getVariablesInScope(node, node, true);
  for (var globalName in globals) {
    var declaratorNode = globals[globalName];
    if (this.shouldRenameNode_(declaratorNode)) {
      var globalQualifier = declaratorNode.typeAttribute.qualifier;
      if (globalQualifier == 'varying' || globalQualifier == 'uniform') {
        this.currentNameGenerator_.shortenSymbol(globalName);
      } else {
        localGlobals.push(globalName);
      }
    }
  }
  this.pushStack_(node);
  goog.array.forEach(localGlobals, function(globalName) {
    this.currentNameGenerator_.shortenSymbol(globalName);
  }, this);
};


/**
 * Before transforming a declarator, we store the the current decalator node so
 *     we can determine the type of a declarator item.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.beforeTransformDeclarator =
    function(node) {
  this.currentDeclaratorNode_ = node;
};


/**
 * After transforming a declarator item, clear the current declarator node.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.afterTransformDeclarator =
  function(node) {
  this.currentDeclaratorNode_ = null;
};


/**
 * Minifys a parameter name.
 * @param {!Object} node The node to to rename.
 * @return {!Object} The renamed node.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.transformParameter =
      function(node) {
  var result = glslunit.ASTTransformer.cloneNode(node);
  result.name = this.currentNameGenerator_.shortenSymbol(node.name);
  return result;
};


/**
 * Save the current renaming map onto our stack of variable rename maps and
 *     create a new map for the scope to be transformed, copying all existing
 *     rename entries from the existing map to the new, current map.
 * @param {!Object} node The node to transform.
 * @private
 */
glslunit.compiler.VariableMinifier.prototype.pushStack_ = function(node) {
  this.variableStack_.push(this.currentNameGenerator_);
  this.currentNameGenerator_ = this.currentNameGenerator_.clone();
};


/**
 * Pop the stack of variable renaming maps to the previous state.
 * @param {!Object} node The node to transform.
 * @private
 */
glslunit.compiler.VariableMinifier.prototype.popStack_ = function(node) {
  this.maxNameId_ = Math.max(this.maxNameId_,
      this.currentNameGenerator_.getNextNameIndex());
  this.currentNameGenerator_ = this.variableStack_.pop();
};


/**
 * Push the stack before transforming a scope.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.beforeTransformScope =
    glslunit.compiler.VariableMinifier.prototype.pushStack_;


/**
 * After transforming a scope, we pop the stack of variable renaming maps to
 *     the previous state.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.afterTransformScope =
  glslunit.compiler.VariableMinifier.prototype.popStack_;


/**
 * Track the max ID after transforming the root, but don't
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.afterTransformRoot =
  glslunit.compiler.VariableMinifier.prototype.popStack_;


/**
 * Push the stack before transforming a function declaration.  We need to do
 *     this in addition pushing the stack when transforming a scope so we can
 *     push and pop any parameters.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.
    beforeTransformFunctionDeclaration =
        glslunit.compiler.VariableMinifier.prototype.pushStack_;


/**
 * After transforming a function declaration pop the declaration stack to pop
 *     off any parameters that were declared.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.afterTransformFunctionDeclaration =
    glslunit.compiler.VariableMinifier.prototype.popStack_;


/**
 * Push the stack before transforming a function prototype.  We need to do
 *     this in addition pushing the stack when transforming a scope so we can
 *     push and pop any parameters.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.beforeTransformFunctionPrototype =
  glslunit.compiler.VariableMinifier.prototype.pushStack_;


/**
 * After transforming a function prototype pop the declaration stack to pop
 *     off any parameters that were declared.
 * @param {!Object} node The node to transform.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.afterTransformFunctionPrototype =
    glslunit.compiler.VariableMinifier.prototype.popStack_;


/**
 * Adds the short name for this variable declaration to the current map of long
 *     name to short names.
 * @param {!Object} node The node to to rename.
 * @return {!Object} The renamed node.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.beforeTransformDeclaratorItem =
    function(node) {
  var newName = node.name.name;
  var qualifier;
  if (this.currentDeclaratorNode_) {
    qualifier = this.currentDeclaratorNode_.typeAttribute.qualifier;
  }
  // If we are minifying public variables or if this variable is not a public
  // variable, then shorten it.
  if (this.shouldRenameNode_(this.currentDeclaratorNode_)) {
    newName = this.currentNameGenerator_.shortenSymbol(node.name.name);
  }
  // If we've got a shader program specified and this identifier was a child
  // of a declarator node, store the renaming entry.
  if (this.shaderProgram_ && this.currentDeclaratorNode_) {
    var nodeType = this.currentDeclaratorNode_.typeAttribute.name;
    if (qualifier == 'attribute') {
      var attributeEntry = new glslunit.compiler.ShaderAttributeEntry();
      attributeEntry.shortName = newName;
      attributeEntry.originalName = node.name.name;
      var parsedSize = parseInt(nodeType.slice(3, 4), 10);
      attributeEntry.variableSize = isNaN(parsedSize) ? 1 : parsedSize;
      this.shaderProgram_.attributeMap[node.name.name] = attributeEntry;
    } else if (qualifier == 'uniform') {
      var uniformEntry = new glslunit.compiler.ShaderUniformEntry();
      uniformEntry.originalName = node.name.name;
      uniformEntry.shortName = newName;
      uniformEntry.type = nodeType;
      this.shaderProgram_.uniformMap[node.name.name] = uniformEntry;
    }
  }
  return node;
};


/**
 * Minifies an identifier if it refers to a parameter that was minified.
 * @param {!Object} node The node to to rename.
 * @return {!Object} The renamed node.
 * @export
 */
glslunit.compiler.VariableMinifier.prototype.transformIdentifier =
    function(node) {
  var newName = this.currentNameGenerator_.getShortSymbol(node.name);
  if (node.name != newName) {
    var result = glslunit.ASTTransformer.cloneNode(node);
    result.name = newName;
    return result;
  }
  return node;
};


/**
 * The name of this compilation step.
 * @type {string}
 * @const
 */
glslunit.compiler.VariableMinifier.NAME = 'VariableMinifier';


/** @override */
glslunit.compiler.VariableMinifier.prototype.getName = function() {
  return glslunit.compiler.VariableMinifier.NAME;
};


/** @override */
glslunit.compiler.VariableMinifier.prototype.getDependencies =
    function() {
  return [];
};


/** @override */
glslunit.compiler.VariableMinifier.prototype.performStep =
    function(stepOutputMap, shaderProgram) {
  var vertexTransformer = new glslunit.compiler.VariableMinifier(
      this.minifyPublicVariables_);
  vertexTransformer.setShaderProgram(shaderProgram);
  shaderProgram.vertexAst =
    vertexTransformer.transformNode(shaderProgram.vertexAst);


  var fragmentTransformer = new glslunit.compiler.VariableMinifier(
      this.minifyPublicVariables_);
  fragmentTransformer.setShaderProgram(shaderProgram);
  // Set the fragment's rename map to the old rename map from the vertex shader
  // so their globals get renamed the same way.
  fragmentTransformer.currentNameGenerator_ =
      vertexTransformer.currentNameGenerator_;

  shaderProgram.fragmentAst =
      fragmentTransformer.transformNode(shaderProgram.fragmentAst);


  return {
    'vertexMaxId': vertexTransformer.maxNameId_,
    'fragmentMaxId': fragmentTransformer.maxNameId_
  };
};
