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
 * @fileoverview Test cases for the NumericShaderVariable.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.NumberShaderVariable');
goog.require('goog.array');
goog.require('goog.testing.LooseMock');
goog.require('goog.testing.StrictMock');
goog.require('goog.testing.jsunit');

function setUp() {
  var func = function()  {};
  webglContext = {
    bindBuffer: func,
    vertexAttribPointer: func,
    createBuffer: func,
    bufferData: func,
    deleteBuffer: func
  };
  for (var i = 1; i <= 4; i++) {
    webglContext['uniform' + i + 'iv'] = func;
    webglContext['uniform' + i + 'fv'] = func;
    webglContext['uniformMatrix' + i + 'fv'] = func;
  }
}


function testWrongBufferLength() {
  var shaderVariable = new glslunit.NumberShaderVariable('foo',
    [3.14, 1.6, 2.72, 6]);
  var varType = 'vec3';
  shaderVariable.getTypeName = function() {
    return varType;
  }
  var errorMessage = 'Error while buffering foo: Expected a variable of ' +
      'length 3 for a vec3, but got a variable of length 4';
  assertThrows(errorMessage,
               function() {shaderVariable.bufferData(null, null, 3, 0)});

  varType = 'mat4';
  errorMessage = 'Error while buffering foo: Expected a variable of ' +
      'length 16 for a mat4, but got a variable of length 4';
   assertThrows(errorMessage,
                function() {shaderVariable.bufferData(null, null, 3, 0)});

  varType = 'sampler2D';
  errorMessage = 'Error while buffering foo:  Expected a texture ' +
      'but got a numeric variable';
   assertThrows(errorMessage,
                function() {shaderVariable.bufferData(null, null, 3, 0)});
}

/**
 * Test calls to setBufferType.
 */
function testBufferType() {
  var shaderVariable = new glslunit.NumberShaderVariable(null,
                                                         [3.14, 1.6, 2.72]);
  Int32Array = function() {};
  Float32Array = function() {};
  Uint16Array = function() {};
  assertEquals(Int32Array, shaderVariable.getBufferType_('i'));
  assertEquals(Float32Array, shaderVariable.getBufferType_('f'));
  shaderVariable.setBufferType(Uint16Array);
  assertEquals(Uint16Array, shaderVariable.getBufferType_('i'));
}

/**
 * Tests that types are decomposed properly into their components.
 */
function testDecomposeType() {
  var decomposedType = glslunit.NumberShaderVariable.decomposeType_('float');
  assertEquals('f', decomposedType.glslType);
  assertEquals('1', decomposedType.size);
  assertEquals(false, decomposedType.isMatrix);
  decomposedType = glslunit.NumberShaderVariable.decomposeType_('int');
  assertEquals('i', decomposedType.glslType);
  assertEquals('1', decomposedType.size);
  assertEquals(false, decomposedType.isMatrix);
  decomposedType = glslunit.NumberShaderVariable.decomposeType_('bool');
  assertEquals('i', decomposedType.glslType);
  assertEquals('1', decomposedType.size);
  assertEquals(false, decomposedType.isMatrix);
  decomposedType = glslunit.NumberShaderVariable.decomposeType_('vec3');
  assertEquals('f', decomposedType.glslType);
  assertEquals('3', decomposedType.size);
  assertEquals(false, decomposedType.isMatrix);
  decomposedType = glslunit.NumberShaderVariable.decomposeType_('bvec4');
  assertEquals('i', decomposedType.glslType);
  assertEquals('4', decomposedType.size);
  assertEquals(false, decomposedType.isMatrix);
  decomposedType = glslunit.NumberShaderVariable.decomposeType_('mat4');
  assertEquals('f', decomposedType.glslType);
  assertEquals('4', decomposedType.size);
  assertEquals(true, decomposedType.isMatrix);
}

/**
 * Tests that Attributes get buffered properly.
 */
function testAttributeBuffer() {
  var shaderVariable = new glslunit.NumberShaderVariable(null,
                                                         [3.14, 1.6, 2.72]);
  var varType = 'vec3';
  var testLocation = 1234;
  var testBuffer = {};
  shaderVariable.getQualifierType = function() {
    return glslunit.ShaderVariable.QualifierType.ATTRIBUTE;
  }
  shaderVariable.getTypeName = function() {
    return varType;
  }
  shaderVariable.getLocation = function(context, program) {
    return testLocation;
  }
  var webglMock = new goog.testing.StrictMock(webglContext);
  webglMock.ARRAY_BUFFER = 0xD00D;
  webglMock.STATIC_DRAW = 0xDEAD;
  webglMock.FLOAT = 0xABBA;
  webglMock.createBuffer().$returns(testBuffer);
  webglMock.bindBuffer(webglMock.ARRAY_BUFFER, testBuffer);
  webglMock.bufferData(webglMock.ARRAY_BUFFER,
                       goog.testing.mockmatchers.isObject,
                       webglMock.STATIC_DRAW).
    $does(function(unused_1, valuesArray, unused_2) {
      assertTrue(goog.array.equals([3.14, 1.6, 2.72,
                                    3.14, 1.6, 2.72,
                                    3.14, 1.6, 2.72],
                                    valuesArray));
    });
  webglMock.bindBuffer(webglMock.ARRAY_BUFFER, null);
  webglMock.bindBuffer(webglMock.ARRAY_BUFFER, testBuffer);
  webglMock.vertexAttribPointer(testLocation, 3, webglMock.FLOAT,
                                false, 0, 0);
  webglMock.bindBuffer(webglMock.ARRAY_BUFFER, null);
  webglMock.deleteBuffer(testBuffer);
  webglMock.$replay();

  shaderVariable.bufferData(webglMock, null, 3, 0);
  shaderVariable.bindData(webglMock, null);
  shaderVariable.cleanUp(webglMock);
  webglMock.$verify();
}


/**
 * Tests that Uniforms get buffered properly.
 */
function testUniformBuffer() {
  var shaderVariable = new glslunit.NumberShaderVariable(null, [3.14]);
  var varType = 'float';
  var testLocation = {};
  var overrideShaderVar = function() {
    shaderVariable.getQualifierType = function() {
      return glslunit.ShaderVariable.QualifierType.UNIFORM;
    }
    shaderVariable.getTypeName = function() {
      return varType;
    }
    shaderVariable.getLocation = function(context, program) {
      return testLocation;
    }
  };
  overrideShaderVar();
  var webglMock = new goog.testing.LooseMock(webglContext);
  webglMock.uniform1fv(goog.testing.mockmatchers.isObject,
                       goog.testing.mockmatchers.isObject)
      .$does(function(location, testArray) {
         assertEquals(testLocation, location);
         assertEquals(1, testArray.length);
         assertEquals(3.14, testArray[0]);
       });
  webglMock.$replay();

  shaderVariable.bufferData(webglMock, null, 3, 0);
  webglMock.$verify();

  varType = 'int';
  webglMock = new goog.testing.LooseMock(webglContext);
  webglMock.uniform1iv(goog.testing.mockmatchers.isObject,
                       goog.testing.mockmatchers.isObject)
      .$does(function(location, testArray) {
         assertEquals(testLocation, location);
         assertEquals(1, testArray.length);
         assertEquals(3.14, testArray[0]);
       });
  webglMock.$replay();

  shaderVariable.bufferData(webglMock, null, 3, 0);
  webglMock.$verify();

  varType = 'mat4';
  var inputArray = [];
  for (var i = 0; i < 16; ++i) {
    inputArray.push(i);
  }
  shaderVariable = new glslunit.NumberShaderVariable(null, inputArray);
  overrideShaderVar();
  webglMock = new goog.testing.LooseMock(webglContext);
  webglMock.uniformMatrix4fv(goog.testing.mockmatchers.isObject,
                             false,
                             goog.testing.mockmatchers.isObject)
      .$does(function(location, unused, testArray) {
         assertEquals(testLocation, location);
         assertEquals(16, testArray.length);
         assertTrue(goog.array.equals(testArray, inputArray));
       });
  webglMock.$replay();

  shaderVariable.bufferData(webglMock, null, 3, 0);
  shaderVariable.cleanUp(webglMock);
  webglMock.$verify();
}
