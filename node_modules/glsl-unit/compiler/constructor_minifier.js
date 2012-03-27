// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Optimizer that minifies conversion.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.ConstructorMinifier');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.CallGraphVisitor');
goog.require('glslunit.Generator');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('goog.array');



/**
 * Optimizer that minifies constructors by converting from the shortest type and
 * replaces redundant arguments.  For example. vec4(1., 1., 1., 1.) will become
 * vec4(1).
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @implements {glslunit.compiler.CompilerStep}
 */
glslunit.compiler.ConstructorMinifier = function() {
  goog.base(this);

  /**
   * Stack of all nodes being transformed.
   * @type {Array.<string>}
   * @private
   */
  this.nodeStack_ = [];
};
goog.inherits(glslunit.compiler.ConstructorMinifier,
              glslunit.ASTTransformer);


/**
 * Map of built in conversion and constructor functions in GLSL to the number
 * of arguments they take.
 * @const
 * @type {!Object.<string, number>}
 * @private
 */
glslunit.compiler.ConstructorMinifier.CONVERSION_FUNCTIONS_ = {
  'vec2': 2, 'vec3': 3, 'vec4': 4,
  'bvec2': 2, 'bvec3': 3, 'bvec4': 4,
  'ivec2': 2, 'ivec3': 3, 'ivec4': 4,
  'mat2': 4, 'mat3': 9, 'mat4': 16,
  'float': 1, 'int': 1, 'bool': 1
};


/** @override */
glslunit.compiler.ConstructorMinifier.prototype.getBeforeTransformFunction =
    function(node) {
  this.nodeStack_.push(node);
};


/** @override */
glslunit.compiler.ConstructorMinifier.prototype.getAfterTransformFunction =
    function(node) {
  this.nodeStack_.pop();
};


/**
 * Determines whether or not the current parent node is a conversion function.
 * @return {boolean} Whether or not the parent node is a conversion function.
 * @private
 */
glslunit.compiler.ConstructorMinifier.prototype.parentIsConstructor_ =
    function() {
  var parentNode = this.nodeStack_.slice(-2)[0];
  return parentNode.type == 'function_call' &&
      parentNode.function_name in
          glslunit.compiler.ConstructorMinifier.CONVERSION_FUNCTIONS_;
}

/**
 * If able to, converts a node to an integer.
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @private
 */
glslunit.compiler.ConstructorMinifier.prototype.maybeConvertToInt_ =
    function(node) {
  // We slice off at -2 because the node itself will also be on the stack, and
  // we want it's parent.
  if (this.parentIsConstructor_() &&
      Math.abs(node.value) < 1 << 16) { // The WebGL Spec only requires 17 bits
                                      // per integer, so we need this to prevent
                                      // overflow.
    if (node.value == Math.round(node.value)) {
      var result = glslunit.ASTTransformer.cloneNode(node);
      result.type = 'int';
      result.value = Number(node.value);
      return result;
    }
  }
  return node;
};


/**
 * Transforms all floats who are the children of conversion nodes to ints iff
 * the float represents an integer.  For example, vec2(0.,1.) will become
 * vec2(0,1);
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @export
 */
glslunit.compiler.ConstructorMinifier.prototype.transformFloat =
    glslunit.compiler.ConstructorMinifier.prototype.maybeConvertToInt_;


/**
 * Transforms all bools who are the children of conversion nodes to ints iff
 * the float represents an integer.  For example. bvec2(false, true) will be
 * transformed into bvec2(0,1);
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @export
 */
glslunit.compiler.ConstructorMinifier.prototype.transformBool =
    glslunit.compiler.ConstructorMinifier.prototype.maybeConvertToInt_;


/**
 * If a vec* constructor call has all of its parameters with the same value,
 * we only need to specify the value once.  For example, vec4(1, 1, 1, 1) will
 * become vec4(1).  If a mat* constructor call is a diagonal matrix, then we
 * only need the diagonal value.  For example. mat2(5, 0, 0, 5) will become
 * mat2(5).
 * @param {!Object} node The node to transform.
 * @return {!Object} The transformed node.
 * @export
 */
glslunit.compiler.ConstructorMinifier.prototype.transformFunctionCall =
    function(node) {
  var expectedArgumentCount =
      glslunit.compiler.ConstructorMinifier.CONVERSION_FUNCTIONS_[
          node.function_name];
  if (expectedArgumentCount) {
    // If the parent of a constructor function is a constructor function, we
    // don't need to do the conversion before passing the parmeter to the
    // parent, the parent constructor will do that for us.
    // e.g. mat2(vec2(x, y), vec2(z, a)) == mat2(x,y,z,a);
    if (this.parentIsConstructor_()) {
      if (node.parameters.length == expectedArgumentCount) {
        return node.parameters;
      }
    }
    if (node.parameters && node.parameters.length > 1) {
      var firstParam = glslunit.Generator.getSourceCode(node.parameters[0]);
      var minifyDeclaration = false;
      if (node.function_name.slice(0, 3) == 'mat') {
        // Check to see if the the matrix is a multiple of the identity matrix.
        if (node.parameters.length == expectedArgumentCount) {
          var isIdent = true;
          var dimensions = parseInt(node.function_name.slice(-1), 10);
          for (var i = 0; i < dimensions && isIdent; i++) {
            for (var j = 0; j < dimensions && isIdent; j++) {
              var cell = glslunit.Generator.getSourceCode(
                  node.parameters[i * dimensions + j]);
              isIdent = cell == (i == j ? firstParam : '0');
            }
          }
          if (isIdent) {
            minifyDeclaration = true;
          }
        }
      } else {
        var allEqual = goog.array.every(node.parameters, function(parameter) {
          return glslunit.Generator.getSourceCode(parameter) == firstParam;
        });
        if (allEqual) {
          minifyDeclaration = true;
        }
      }
      if (minifyDeclaration) {
        var result = glslunit.ASTTransformer.cloneNode(node);
        result.parameters = [node.parameters[0]];
        return result;
      }
    }
  }
  return node;
};


/**
 * The name of this compilation step.
 * @type {string}
 * @const
 */
glslunit.compiler.ConstructorMinifier.NAME = 'ConstructorMinifier';


/** @override */
glslunit.compiler.ConstructorMinifier.prototype.getName = function() {
  return glslunit.compiler.ConstructorMinifier.NAME;
};


/** @override */
glslunit.compiler.ConstructorMinifier.prototype.getDependencies =
    function() {
  return [];
};


/** @override */
glslunit.compiler.ConstructorMinifier.prototype.performStep =
    function(stepOutputMap, shaderProgram) {
  var vertexTransformer = new glslunit.compiler.ConstructorMinifier();
  var fragmentTransformer = new glslunit.compiler.ConstructorMinifier();
  shaderProgram.vertexAst =
      vertexTransformer.transformNode(shaderProgram.vertexAst);
  shaderProgram.fragmentAst =
      fragmentTransformer.transformNode(shaderProgram.fragmentAst);
  return [];
};
