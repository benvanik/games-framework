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
 * @fileoverview Abstract base class for a shader variable.  ShaderVariables are
 * responsible for buffering data to the graphics card.  The concrete subclasses
 * are NumberShaderVariables that can buffer any numeric data and
 * TextureShaderVariables that can buffer sampler2Ds or samplerCubes.
 *
 * Abstract method must be overridden by subclasses:
 *   bufferData - Buffers data for the variable to the graphics card.
 *
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.ShaderVariable');


/**
 * Creates a ShaderVariable
 * @param {string} name The name of the variable.
 * @param {boolean=} isTexture Whether or not this variable is a texture.
 * @constructor
 */
glslunit.ShaderVariable = function(name, isTexture) {
  /**
   * Map of variable name to declaration of all root variables in the shader
   *     program created with {@code glslunit.VariableScopeVisitor}
   * @type {!Object.<string, !Object>}
   * @private
   */
  this.globalVariables_ = {};

  /**
   * Map of original variable names to re-written names.
   * @type {Object.<string, string>}
   * @private
   */
  this.renameMap_;

  /**
   * The name of the variable.
   * @type {string}
   * @private
   */
  this.name_ = name;

  /**
   * Whether or not this variable is buffering a texture.
   * @type {boolean}
   * @private
   */
  this.isTexture_ = !!isTexture;

  /**
   * If this ShaderVariable is an Attribute, this will store the attribute
   * location so it can be disabled later.
   * @type {?number}
   * @private
   */
  this.attributeLocation_ = null;
};


/**
 * Enum for the type of Variable.
 * @enum {number}
 */
glslunit.ShaderVariable.QualifierType = {
  UNIFORM: 1,
  ATTRIBUTE: 2,
  VARYING: 3
};


/**
 * Gets the name of this variable, looking to see if the name has been
 *     overridden by passing a renameMap into setGlobalVariables.
 * @return {string}  The name of this variable.
 */
glslunit.ShaderVariable.prototype.getName = function() {
  if (this.renameMap_) {
    var renamed = this.renameMap_[this.name_];
    if (renamed) {
      return renamed;
    }
  }
  return this.name_;
};


/**
 * Sets the global variables and possibly the rename map for this shader
 *     variable.
 * @param {!Object} globalVariables Map of variable name to
 *     declaration for all root variables created with
 *     {@code glslunit.VariableScopeVisitor}.
 * @param {!Object=} renameMap Map of variable names to their
 *     rewritten names.
 */
glslunit.ShaderVariable.prototype.setGlobalVariables =
    function(globalVariables, renameMap) {
  this.globalVariables_ = globalVariables;
  this.renameMap_ = renameMap || null;
};


/**
 * Gets whether or not this variable is buffering a texture.
 * @return {boolean} True if this variable is a texture, false otherwise.
 */
glslunit.ShaderVariable.prototype.getIsTexture = function() {
  return this.isTexture_;
};


/**
 * Sets the value of this variable on the graphics card.  This function will
 * infer the type and qualifier of the variable from the globalVariables map
 * and make the appropriate calls in context to set this variable.  This
 * function will only buffer data in textures or buffers, not actually bind the
 * data to their corresponding shader variables, so bindData should usually be
 * called after calling bufferData.
 * @param {!WebGLRenderingContext} context The WebGL context.
 * @param {!WebGLProgram} program The compiled and linked shader program.
 * @param {number} numTestVertices The number of vertices to use in this test
 *     case.  We will duplicate any attribute data once for each test vertex
 *     before buffering it to the graphics card.
 * @param {number} nextTextureUnit The next texture unit to use for binding
 *     textures.
 */
glslunit.ShaderVariable.prototype.bufferData = goog.abstractMethod;


/**
 * Binds the buffered data to the proper shader variable.  This function should
 * only be called after bufferData has been called.
 * @param {!WebGLRenderingContext} context The WebGL context.
 * @param {!WebGLProgram} program The compiled and linked shader program.
 */
glslunit.ShaderVariable.prototype.bindData = goog.abstractMethod;


/**
 * Cleans up after this shader variable, deleting any buffers or textures it
 *     created.
 * @param {!WebGLRenderingContext} context The WebGL context.
 */
glslunit.ShaderVariable.prototype.cleanUp = function(context) {
  if (this.attributeLocation_ != null) {
    context.disableVertexAttribArray(this.attributeLocation_);
  }
};


/**
 * Gets the location of this variable in the shader program.
 * @param {!WebGLRenderingContext} context The WebGL context.
 * @param {!WebGLProgram} program The GLSL Program this variable is part of.
 * @return {WebGLUniformLocation|number} The location of the variable in
 *     program.
 */
glslunit.ShaderVariable.prototype.getLocation = function(context, program) {
  var qualifier = this.getQualifierType();
  this.attributeLocation_ = null;
  if (qualifier == glslunit.ShaderVariable.QualifierType.ATTRIBUTE) {
    var attribute = context.getAttribLocation(program, this.getName());
    if (attribute >= 0) {
      context.enableVertexAttribArray(attribute);
      this.attributeLocation_ = attribute;
      return attribute;
    } else {
      return null;
    }
  } else {
    // Varyings will be passed to fragment shader test as uniforms.
    return context.getUniformLocation(program, this.getName());
  }
};


/**
 * Gets the qualifier type of this variable by looking it up in the AST.
 * @return {glslunit.ShaderVariable.QualifierType} The variable type.
 */
glslunit.ShaderVariable.prototype.getQualifierType = function() {
  var declaration = this.globalVariables_[this.getName()];
  if (declaration) {
    var qualifier = declaration.typeAttribute.qualifier;
    if (qualifier) {
      // Strip off any instances of 'invariant' in the beginning of the
      // qualifier and look it up in the VariableType enum.
      return glslunit.ShaderVariable.QualifierType[
          qualifier.split(' ').slice(-1)[0].toUpperCase()];
    }
  }
  throw this.getName() + ' was not an input variable to the shader program.';
};


/**
 * Gets the type name of this variable by looking it up in the AST.
 * @return {string} The name of this variable's type.
 */
glslunit.ShaderVariable.prototype.getTypeName = function() {
  // TODO(rowillia): Handle structs and arrays.
  var declaration = this.globalVariables_[this.getName()];
  var type = declaration.typeAttribute.name;
  return type;
};
