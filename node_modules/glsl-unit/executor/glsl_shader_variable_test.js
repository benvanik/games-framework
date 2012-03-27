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
 * @fileoverview Test cases for the ShaderVariable.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.ShaderVariable');
goog.require('glslunit.VariableScopeVisitor');
goog.require('glslunit.glsl.parser');
goog.require('goog.testing.LooseMock');
goog.require('goog.testing.jsunit');

function setUp() {
  var testSource =
      'attribute float foo;' +
      'uniform vec3 zzz;' +
      'mat3 global;' +
      'invariant varying float raz;';
  var testAST = glslunit.glsl.parser.parse(testSource, 'vertex_start');
  rootVariables =
    glslunit.VariableScopeVisitor.getVariablesInScope(testAST, testAST);
  var func = function()  {};
  webglContext = {
    enableVertexAttribArray: func,
    disableVertexAttribArray: func,
    getAttribLocation: func,
    getUniformLocation: func
  };
}


/**
 * Tests that attributes get their location correctly.
 */
function testAttribute() {
  var fooShaderVariable = new glslunit.ShaderVariable('foo');
  fooShaderVariable.setGlobalVariables(rootVariables);
  assertEquals('foo should be an attribute',
              glslunit.ShaderVariable.QualifierType.ATTRIBUTE,
              fooShaderVariable.getQualifierType());

  var webglMock = new goog.testing.LooseMock(webglContext);
  var testProgram = {};
  var testLocation = 555;
  webglMock.getAttribLocation(testProgram, 'foo').$returns(testLocation);
  webglMock.enableVertexAttribArray(testLocation);
  webglMock.disableVertexAttribArray(testLocation);
  webglMock.$replay();

  var result = fooShaderVariable.getLocation(webglMock, testProgram);
  assertEquals(result, testLocation);
  assertEquals(false, fooShaderVariable.getIsTexture());
  assertEquals('float', fooShaderVariable.getTypeName());
  fooShaderVariable.cleanUp(webglMock);
  webglMock.$verify();
}


/**
 * Tests that uniforms get their location correctly.
 */
function testUniform() {
  var barShaderVariable = new glslunit.ShaderVariable('bar');
  barShaderVariable.setGlobalVariables(rootVariables,
                                       {'bar': 'zzz'});
  assertEquals('bar should be a uniform',
               glslunit.ShaderVariable.QualifierType.UNIFORM,
               barShaderVariable.getQualifierType());

  var webglMock = new goog.testing.LooseMock(webglContext);
  var testProgram = {};
  var testLocation = {};
  webglMock.getUniformLocation(testProgram, 'zzz').$returns(testLocation);
  webglMock.$replay();

  var result = barShaderVariable.getLocation(webglMock, testProgram);
  assertEquals(result, testLocation);

  webglMock.$verify();
}


/**
 * Tests that varyings get their location correctly.
 */
function testVarying() {
  var razShaderVariable = new glslunit.ShaderVariable('raz');
  razShaderVariable.setGlobalVariables(rootVariables,
                                       {'bar': 'zzz'});
  assertEquals('raz should be a varying',
               glslunit.ShaderVariable.QualifierType.VARYING,
               razShaderVariable.getQualifierType());

  var webglMock = new goog.testing.LooseMock(webglContext);
  var testProgram = {};
  var testLocation = {};
  webglMock.getUniformLocation(testProgram, 'raz').$returns(testLocation);
  webglMock.$replay();

  var result = razShaderVariable.getLocation(webglMock, testProgram);
  assertEquals(result, testLocation);

  webglMock.$verify();
}


/**
 * Tests that the proper exception gets thrown when a shader variable is missing
 * from the global scope.
 */
function testExceptionOnMising() {
  var mehShaderVariable = new glslunit.ShaderVariable('meh');
  mehShaderVariable.setGlobalVariables(rootVariables,
                                       {'bar': 'zzz'});
  var exceptionThrown = false;
  try {
    mehShaderVariable.getQualifierType();
  } catch (e) {
    exceptionThrown = true;
    assertEquals(e, 'meh was not an input variable to the shader program.');
  }
  assertTrue(exceptionThrown);
}


/**
 * Tests that the proper exception gets thrown when a shader variable is a
 * non-input global.
 */
function testExceptionOnNonInput() {
  var globalShaderVariable = new glslunit.ShaderVariable('global');
  globalShaderVariable.setGlobalVariables(rootVariables,
                                       {'bar': 'zzz'});
  var exceptionThrown = false;
  try {
    globalShaderVariable.getQualifierType();
  } catch (e) {
    exceptionThrown = true;
    assertEquals(e, 'global was not an input variable to the shader program.');
  }
  assertTrue(exceptionThrown);
}
