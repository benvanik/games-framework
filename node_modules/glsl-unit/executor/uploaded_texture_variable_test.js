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
 * @fileoverview Test cases for the UploadedTextureVariable.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.UploadedTextureVariable');
goog.require('goog.testing.LooseMock');
goog.require('goog.testing.jsunit');

function setUp() {
  var func = function()  {};
  webglContext = {
    bindTexture: func,
    activeTexture: func,
    uniform1i: func
  };
}

/**
 * Tests that Textures get buffered properly.
 */
function testBindUploadedTexture() {
  var varType = 'sampler2D';
  var testTexture = {};
  var testLocation = {};

  var shaderVariable = new glslunit.UploadedTextureVariable(null, testTexture);

  shaderVariable.getQualifierType = function() {
    return glslunit.ShaderVariable.QualifierType.UNIFORM;
  }
  shaderVariable.getTypeName = function() {
    return varType;
  }
  shaderVariable.getLocation = function(context, program) {
    return testLocation;
  }

  var webglMock = new goog.testing.LooseMock(webglContext);
  webglMock.TEXTURE_2D = 0x2D2D;
  webglMock.TEXTURE0 = 0x1106;
  webglMock.TEXTURE11 = 0x1111;

  webglMock.activeTexture(webglMock.TEXTURE11);
  webglMock.bindTexture(webglMock.TEXTURE_2D, testTexture);
  webglMock.uniform1i(testLocation, 11);

  webglMock.$replay();

  shaderVariable.bufferData(webglMock, null, 3, 11);
  shaderVariable.bindData(webglMock, null);
  shaderVariable.cleanUp();
  webglMock.$verify();
}
