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
 * @fileoverview Shader Variable (uniform or varying) that's stored as a number
 *     (as opposed to a texture).  This class will handle all variables types
 *     except sampler2D or samplerCube.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.NumberShaderVariable');
goog.provide('glslunit.TypedArrayConstructor');

goog.require('glslunit.ShaderVariable');
goog.require('goog.array');

/**
 * @typedef {function (new:ArrayBufferView,
 *     (Array|ArrayBuffer|ArrayBufferView|null|number), (number)=, (number)=)}
 */
glslunit.TypedArrayConstructor;

/**
 * Constructs a NumberShaderVariable.
 * @param {string} name The name of the variable.
 * @param {Array.<number>} values The values to be buffered to the graphics
 *      card when calling BufferData.
 * @extends {glslunit.ShaderVariable}
 * @constructor
 */
glslunit.NumberShaderVariable = function(name, values) {
  goog.base(this, name);

  /**
   * The values for this variable.
   * @type {Array.<number>}
   * @private
   */
  this.values_ = values;

  /**
   * The TypedArray type to use when buffering data.  By default, a
   *     NumberShaderVariable will infer which TypedArray to use, but this can
   *     be overridden with setBufferType.
   * @type {?glslunit.TypedArrayConstructor}
   * @private
   */
  this.bufferType_ = null;

  /**
   * The WebGLBuffer created during bufferData, if this variable is an
   *     attribute.
   * @type {WebGLBuffer}
   * @private
   */
  this.buffer_ = null;

  /**
   * The number of elements per vertex in the data buffered in this.buffer_.
   * @type {number}
   * @private
   */
  this.bufferValueSize_ = 0;
};
goog.inherits(glslunit.NumberShaderVariable, glslunit.ShaderVariable);


/**
 * Sets the type of TypedArray to use when buffering data for this variable.
 * @param {!glslunit.TypedArrayConstructor} bufferType The type of TypedArray to
 *     use when buffering data.
 */
glslunit.NumberShaderVariable.prototype.setBufferType = function(bufferType) {
  this.bufferType_ = bufferType;
};


/**
 * Decomposes a GLSL Type into the relevant parts needed to make the GL call to
 * set values on it.
 * @param {string} typeName The GLSL type being decomposed.
 * @return {!{glslType: string, size: string, isMatrix: boolean}}
 * @private
 * @nosideeffects
 */
glslunit.NumberShaderVariable.decomposeType_ = function(typeName) {
  var isMatrix = false, glslType, size;
  if (typeName == 'float') {
    glslType = 'f';
    size = '1';
  } else if (typeName == 'int' || typeName == 'bool') {
    glslType = 'i';
    size = '1';
  } else {
    if (typeName.slice(0, 3) == 'mat') {
      isMatrix = true;
      glslType = 'f';
    } else if (typeName[0] == 'i' || typeName[0] == 'b') {
      glslType = 'i';
      typeName = typeName.slice(1);
    } else {
      glslType = 'f';
    }
    size = typeName.slice(3);
  }
  return {
    glslType: glslType,
    size: size,
    isMatrix: isMatrix
  };
};


/**
 * Gets the type of TypedArray to use when buffering data.  If setBufferType has
 *     been called, it will use that type, otherwise it will infer the type from
 *     the parameter 'glslType'.
 * @param {string} glslType The prefix of the GLSL Type for this variable.
 *     Generated with decomposeType_.
 * @return {!glslunit.TypedArrayConstructor} The type to use when buffering
 *     data.
 * @private
 */
glslunit.NumberShaderVariable.prototype.getBufferType_ = function(glslType) {
  if (this.bufferType_) {
    return this.bufferType_;
  } else {
    if (glslType == 'i') {
      return Int32Array;
    } else {
      return Float32Array;
    }
  }
};


/** @inheritDoc */
glslunit.NumberShaderVariable.prototype.bufferData = function(
    context, program, numTestVertices, nextTextureUnit) {
  var typeName = this.getTypeName();
  if (typeName == 'sampler2D') {
    throw 'Error while buffering ' + this.getName() + ': Expected a texture ' +
        'but got a numeric variable';
  }
  var decomposedType = glslunit.NumberShaderVariable.decomposeType_(typeName);
  var expectedInputLength = decomposedType.size;
  if (decomposedType.isMatrix) {
    expectedInputLength *= expectedInputLength;
  }
  if (this.values_.length != expectedInputLength) {
    throw 'Error while buffering ' + this.getName() + ': Expected a variable ' +
        'of length ' + expectedInputLength + ' for a ' + typeName + ', but ' +
        'got a variable of length ' + this.values_.length;
  }
  var qualifier = this.getQualifierType();

  var valuesArray = goog.array.clone(this.values_);
  // Attributes will be duplicated once for each test vertex.
  if (qualifier == glslunit.ShaderVariable.QualifierType.ATTRIBUTE) {
    for (var i = 0; i < numTestVertices - 1; i++) {
      [].push.apply(valuesArray, this.values_);
    }
  }
  var bufferType = this.getBufferType_(decomposedType.glslType);
  var valuesTypedArray = new bufferType(valuesArray);
  // We always buffer data as the highest precision available.
  if (qualifier == glslunit.ShaderVariable.QualifierType.UNIFORM) {
    var methodName = 'uniform' + (decomposedType.isMatrix ? 'Matrix' : '') +
        decomposedType.size + decomposedType.glslType + 'v';
    if (decomposedType.isMatrix) {
      context[methodName].apply(context, [this.getLocation(context, program),
                                          false,
                                          valuesTypedArray]);
    } else {
      context[methodName].apply(context, [this.getLocation(context, program),
                                          valuesTypedArray]);
    }
  } else if (qualifier == glslunit.ShaderVariable.QualifierType.ATTRIBUTE) {
    this.bufferAttribute(context,
                         program,
                         parseInt(decomposedType.size, 10),
                         valuesTypedArray);
  }
  // We ignore Varying inputs.  They should have been re-written as Uniforms
  // before being passed in.
};


/**
 * Buffers an attribute variable to the graphics card.
 * @param {!WebGLRenderingContext} context The WebGL context.
 * @param {!WebGLProgram} program The compiled and linked shader program.
 * @param {number} valueSize The number of components per vertex attribute.
 * @param {ArrayBufferView} valuesTypedArray A TypedArray of the values.
 *     to buffer to the graphics card.
 */
glslunit.NumberShaderVariable.prototype.bufferAttribute = function(
    context,
    program,
    valueSize,
    valuesTypedArray) {
  this.buffer_ = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, this.buffer_);
  context.bufferData(context.ARRAY_BUFFER,
                     valuesTypedArray,
                     context.STATIC_DRAW);
  context.bindBuffer(context.ARRAY_BUFFER, null);
  this.bufferValueSize_ = valueSize;
};


/** @override */
glslunit.NumberShaderVariable.prototype.bindData = function(context, program) {
  if (this.buffer_ && this.bufferValueSize_) {
    var location = this.getLocation(context, program);
    context.bindBuffer(context.ARRAY_BUFFER, this.buffer_);
    context.vertexAttribPointer(Number(location), this.bufferValueSize_,
      context.FLOAT, false, 0, 0);
    context.bindBuffer(context.ARRAY_BUFFER, null);
  }
};


/** @override */
glslunit.NumberShaderVariable.prototype.cleanUp = function(context) {
  goog.base(this, 'cleanUp', context);
  if (this.buffer_) {
    context.deleteBuffer(this.buffer_);
  }
};
