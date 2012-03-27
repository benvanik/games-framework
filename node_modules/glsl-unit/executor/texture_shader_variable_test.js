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
 * @fileoverview Test cases for the TextureShaderVariable.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.TextureShaderVariable');
goog.require('goog.testing.LooseMock');
goog.require('goog.testing.StrictMock');
goog.require('goog.testing.jsunit');

function setUp() {
  var func = function()  {};
  webglContext = {
    createTexture: func,
    bindTexture: func,
    activeTexture: func,
    texImage2D: func,
    texParameterf: func,
    texParameteri: func,
    generateMipmap: func,
    uniform1i: func,
    deleteTexture: func
  };
}


/**
 * Tests that attempting to bind a non-texture throws an exception.
 */
function testBindNonTexture() {
  var varType = 'vec4';
  var texData = {};

  var shaderVariable = new glslunit.TextureShaderVariable('non-texture', 42, 21,
                                                          texData);
  shaderVariable.getTypeName = function() {
    return varType;
  }
  var exceptionThrown = false;
  try {
    shaderVariable.bindData(null, null);
  } catch (e) {
    exceptionThrown = true;
    assertEquals('non-texture was bound as a texture, but is a vec4', e);
  }
  assertTrue(exceptionThrown);
}


/**
 * Tests that Textures get buffered properly.
 */
function testBufferTexture() {

  var varType = 'sampler2D';
  var testLocation = {};
  var testTexture = {};
  var texData = {};

  var shaderVariable = new glslunit.TextureShaderVariable(null, 42, 21,
                                                          texData);
  shaderVariable.getQualifierType = function() {
    return glslunit.ShaderVariable.QualifierType.UNIFORM;
  }
  shaderVariable.getTypeName = function() {
    return varType;
  }
  shaderVariable.getLocation = function(context, program) {
    return testLocation;
  }

  var webglMock = new goog.testing.StrictMock(webglContext);

  function setupWebglMock() {
    webglMock.TEXTURE_2D = 0x2D2D;
    webglMock.TEXTURE11 = 0x1111;
    webglMock.RGBA = 0x96BA;
    webglMock.UNSIGNED_BYTE = 0xB17E;

    webglMock.createTexture().$returns(testTexture);
    webglMock.bindTexture(webglMock.TEXTURE_2D, testTexture);
    webglMock.texImage2D(webglMock.TEXTURE_2D, 0, webglMock.RGBA, 21, 42, 0,
                         webglMock.RGBA, webglMock.UNSIGNED_BYTE, texData);
  };
  setupWebglMock();
  webglMock.bindTexture(webglMock.TEXTURE_2D, null);
  webglMock.$replay();

  shaderVariable.bufferData(webglMock, null, 3, 11);
  webglMock.$verify();

  var webglMock = new goog.testing.LooseMock(webglContext);
  setupWebglMock();
  webglMock.bindTexture(webglMock.TEXTURE_2D, null);
  webglMock.generateMipmap(webglMock.TEXTURE_2D);
  webglMock.$replay();

  shaderVariable.setUseMipmap(true);
  shaderVariable.bufferData(webglMock, null, 3, 11);
  webglMock.$verify();

  var webglMock = new goog.testing.StrictMock(webglContext);
  setupWebglMock();
  webglMock.texParameteri(webglMock.TEXTURE_2D, 33, -42);
  webglMock.texParameterf(webglMock.TEXTURE_2D, 99, 54);
  webglMock.bindTexture(webglMock.TEXTURE_2D, null);
  webglMock.activeTexture(webglMock.TEXTURE11);
  webglMock.bindTexture(webglMock.TEXTURE_2D, testTexture);
  webglMock.uniform1i(testLocation, 11);
  webglMock.deleteTexture(testTexture);
  webglMock.$replay();

  shaderVariable.setUseMipmap(false);
  shaderVariable.addParameter(33, -42, false);
  shaderVariable.addParameter(99, 54, true);
  shaderVariable.bufferData(webglMock, null, 3, 11);
  shaderVariable.bindData(webglMock, null);
  shaderVariable.cleanUp(webglMock);
  webglMock.$verify();
}
