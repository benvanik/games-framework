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
 * @fileoverview Test cases for the Executor.
 * @author rowillia@google.com (Roy Williams)
 */


goog.require('glslunit.Executor');
goog.require('glslunit.NumberShaderVariable');
goog.require('glslunit.TextureShaderVariable');
goog.require('glslunit.glsl.parser');
goog.require('goog.array');
goog.require('goog.testing.LooseMock');
goog.require('goog.testing.jsunit');

function setUp() {
  var func = function()  {};
  webglContext = {
    clearColor: func,
    enable: func,
    viewport: func,
    clear: func,
    getShaderParameter: func,
    drawArrays: func,
    readPixels: func,
    createShader: func,
    createProgram: func,
    compileShader: func,
    shaderSource: func,
    attachShader: func,
    linkProgram: func,
    useProgram: func,
    deleteProgram: func
  };
  vertSource =
      'void main(){\n' +
      '  gl_Position=vec4(1.,0.,0.,1.);\n' +
      '}\n';
  fragSource =
      'void main(){\n' +
      '  gl_FragColor=vec4(1.,0.,0.,1.);\n' +
      '}\n';
}


testExecutor = function(context,
                        source_ast,
                        variables,
                        viewportHeight,
                        viewportWidth) {
  glslunit.Executor.call(this, context, source_ast, variables,
                         viewportHeight, viewportWidth);
};
goog.inherits(testExecutor, glslunit.Executor);


/**
 * Gets a dummy fragment source AST.
 * @param {*} unused Unused.
 * @return {Object} Dummy shader program AST.
 */
testExecutor.getFragmentAst = function(unused) {
  return glslunit.glsl.parser.parse(fragSource);
};


/**
 * Gets a dummy fragment source AST.
 * @param {*} unused Unused.
 * @return {Object} Dummy shader program AST.
 */
testExecutor.prototype.getFragmentAst = testExecutor.getFragmentAst;


/**
 * Gets a dummy vertex source AST.
 * @param {*} unused Unused.
 * @return {Object} Dummy shader program AST.
 */
testExecutor.getVertexAst = function(unused) {
  return glslunit.glsl.parser.parse(vertSource);
};


/**
 * Gets a dummy vertex source AST.
 * @param {*} unused Unused.
 * @return {Object} Dummy shader program AST.
 */
testExecutor.prototype.getVertexAst = testExecutor.getVertexAst;

function testDecodeFloat() {
  testValues = [0, 0, 0, 0];
  testValues[0] = 1 << 7;
  testValues[1] = 100;
  assertTrue('Sign bit was positive, should have a positive number',
             glslunit.Executor.decodeFloat(testValues) > 0);
  testValues[0] = 0;
  testValues[1] = 100;
  assertTrue('Sign bit was negative, should have a negatie number',
             glslunit.Executor.decodeFloat(testValues) < 0);
  testValues[0] = 1 << 7 | (0x00000004 << 2);
  assertTrue('exponent field was < 16, should have a number < 0',
             glslunit.Executor.decodeFloat(testValues) < 1);
  testValues[0] = 1 << 7 | (0x00000014 << 2);
  assertTrue('exponent field was > 16, should have a number > 0',
             glslunit.Executor.decodeFloat(testValues) > 1);

  // Some golden tests.
  testValues = [86, 254, 0, 254]; // -32
  assertTrue('Too much error for golden test -32',
             (Math.abs(glslunit.Executor.decodeFloat(testValues) +
                       32.0) / 32.0) < 1e-5);

  testValues = [0, 0, 0, 0]; // Discard
  assertEquals('discard', glslunit.Executor.decodeFloat(testValues));

  testValues = [1 << 7, 0, 0, 0]; // 0
  assertTrue('Too much error for golden test 0',
             Math.abs(glslunit.Executor.decodeFloat(testValues)) < 1e-5);

  testValues = [194, 254, 0, 254]; // 1
  assertTrue('Too much error for golden test 1',
             Math.abs((glslunit.Executor.decodeFloat(testValues) -
                       1.0) / 1.0) < 1e-5);

  testValues = [234, 137, 170, 95]; // 555.0
  assertTrue('Too much error for golden test 555',
             Math.abs((glslunit.Executor.decodeFloat(testValues) -
                 555.0) / 555.0) < 1e-5);
}


/**
 * Tests that the encoded function is added properly.
 */
function testAddEncodeFunction() {
  var testAst = testExecutor.getVertexAst(null);
  var instrumented = glslunit.Executor.addEncodeFunction_(testAst);

  assertEquals('Original AST should have been untouched',
               1,
               testAst.statements.length);

  assertEquals('Should have added mask function',
               'upper_mask',
               instrumented.statements[1].name);

  assertEquals('Should have added encode function',
               'encodeFloat',
               instrumented.statements[2].name);
}


/**
 * Tests that all of the proper WebGL calls are made when making a call to
 * extractValue
 */
function testExtractCall() {
  var webglMock = new goog.testing.LooseMock(webglContext);
  webglMock.VERTEX_SHADER = 0xD00D;
  webglMock.FRAGMENT_SHADER = 0xDEAD;
  webglMock.DEPTH_TEST = 0xABBA;
  webglMock.COLOR_BUFFER_BIT = 0xF00D;
  webglMock.DEPTH_BUFFER_BIT = 0xDEAF;
  webglMock.TRIANGLE_STRIP = 0xFEED;
  webglMock.RGBA = 0xEFF0;
  webglMock.UNSIGNED_BYTE = 0xBEEF;
  webglMock.COMPILE_STATUS = 0xC0A7;
  var vShader = {};
  var fShader = {};
  var sProgram = {};

  webglMock.createShader(webglMock.VERTEX_SHADER).$returns(vShader);
  webglMock.shaderSource(vShader, vertSource);
  webglMock.compileShader(vShader);
  webglMock.getShaderParameter(vShader, webglMock.COMPILE_STATUS).
      $returns(true);

  webglMock.createShader(webglMock.FRAGMENT_SHADER).$returns(fShader);
  webglMock.shaderSource(fShader, fragSource);
  webglMock.compileShader(fShader);
  webglMock.getShaderParameter(fShader, webglMock.COMPILE_STATUS).
      $returns(true);

  webglMock.createProgram().$returns(sProgram);
  webglMock.attachShader(sProgram, vShader);
  webglMock.attachShader(sProgram, fShader);
  webglMock.linkProgram(sProgram);
  webglMock.useProgram(sProgram);

  webglMock.clearColor(0., 0., 0., 0.);
  webglMock.enable(webglMock.DEPTH_TEST);
  webglMock.viewport(0, 0, 150, 250);
  webglMock.clear(webglMock.COLOR_BUFFER_BIT |
                  webglMock.DEPTH_BUFFER_BIT);

  var mockVariable = new goog.testing.LooseMock(
      new glslunit.NumberShaderVariable(null, null, null));
  mockVariable.getLocation(goog.testing.mockmatchers.isObject,
                           goog.testing.mockmatchers.isObject)
    .$times(2)
    .$returns(true);
  mockVariable.setGlobalVariables(goog.testing.mockmatchers.isObject,
                                  goog.testing.mockmatchers.isObject);
  mockVariable.getIsTexture().$returns(false);
  mockVariable.bufferData(webglMock, sProgram, 3, 0);
  mockVariable.bindData(webglMock, sProgram);
  mockVariable.cleanUp(webglMock);

  var mockTextureVariables = [];
  for (var i = 0; i < 3; i++) {
    var mockTextureVariable = new goog.testing.LooseMock(
        new glslunit.TextureShaderVariable(null, null, 0, 0, null));
    mockTextureVariable.setGlobalVariables(
        goog.testing.mockmatchers.isObject,
        goog.testing.mockmatchers.isObject);
    mockTextureVariable.getLocation(goog.testing.mockmatchers.isObject,
                                    goog.testing.mockmatchers.isObject).
        $times(2).
        $returns(i % 2 == 0 ? 123 : null);
    if (i % 2 == 0) {
      mockTextureVariable.bufferData(webglMock, sProgram, 3, i / 2);
      mockTextureVariable.getIsTexture().$returns(true);
      mockTextureVariable.bindData(webglMock, sProgram);
    }
    mockTextureVariable.cleanUp(webglMock);
    mockTextureVariable.$replay();
    mockTextureVariables.push(mockTextureVariable);
  }

  var bufferCalled = false;
  var cleanupCalled = false;
  glslunit.NumberShaderVariable.prototype.bufferAttribute =
      function(context, program, size, verticies) {
        var testVerticies = [-1.0, 1.0,0.0,
                             -1.0,-1.0,0.0,
                              1.0, 1.0,0.0];
        assertEquals(webglMock, context);
        assertEquals(sProgram, program);
        assertEquals(3, size);
        assertTrue(goog.array.equals(testVerticies, verticies));
        bufferCalled = true;
      };
  glslunit.NumberShaderVariable.prototype.bindData =
      function(context, program) {
        assertEquals(webglMock, context);
        assertEquals(sProgram, program);
        assertTrue(bufferCalled);
      };
  glslunit.NumberShaderVariable.prototype.cleanUp = function(context) {
      assertEquals(webglMock, context);
      cleanupCalled = true;
    }
  webglMock.drawArrays(webglMock.TRIANGLE_STRIP, 0, 3);

  var assignBuff = function(u1, u2, u3, u4, u5, u6, buff) {
    // 555.0
    buff[0] = 234;
    buff[1] = 137;
    buff[2] = 170;
    buff[3] = 95;
  };
  webglMock.readPixels(0, 1, 1, 1, webglMock.RGBA,
                       webglMock.UNSIGNED_BYTE,
                       goog.testing.mockmatchers.isObject).
      $does(assignBuff);
  webglMock.readPixels(0, 249, 1, 1, webglMock.RGBA,
                       webglMock.UNSIGNED_BYTE,
                       goog.testing.mockmatchers.isObject).
      $does(assignBuff);
  webglMock.readPixels(148, 249, 1, 1, webglMock.RGBA,
                       webglMock.UNSIGNED_BYTE,
                       goog.testing.mockmatchers.isObject).
      $does(assignBuff);

  mockVariable.$replay();
  webglMock.deleteProgram(sProgram);
  webglMock.$replay();
  var variables = [mockVariable].concat(mockTextureVariables);

  var executor = new testExecutor(webglMock, null, variables, 250, 150);
  assertTrue('Extracted wrong value',
             Math.abs(executor.extractValue(null) - 555.0) < 1);

  goog.array.forEach(variables, function(variable) {
    variable.$verify();
  });
  mockVariable.$verify();
}
