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
 * @fileoverview This file contains the source code for the GLSL Executor.
 *
 * Abstract method must be overridden by subclassed Executors:
 *   getFragmentAst - gets the AST for the fragment shader.
 *   getVertexAst - gets the AST for the vertex shader.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.Executor');
goog.provide('glslunit.ExtractedValue');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.FunctionRenameTransformer');
goog.require('glslunit.Generator');
goog.require('glslunit.NumberShaderVariable');
goog.require('glslunit.SpliceTransformer');
goog.require('glslunit.VariableScopeVisitor');
goog.require('glslunit.glsl.parser');
goog.require('goog.object');


/**
 * @typedef {number|!Array.<number>|glslunit.Executor.DecodeStatus}
 */
glslunit.ExtractedValue;



/**
 * The executor is responsible for executing GLSL Code and extracting target
 * values from that execution.  It is subclassed into the VertexExecutor and
 * the FragmentExecutor which are responsible for extracting data from their
 * respective shader types.
 * @param {!WebGLRenderingContext} context The WebGL  context.
 * @param {!Object} sourceAst The AST of the GLSL code we want to execute and
 *     extract a value from.
 * @param {!Array.<!glslunit.ShaderVariable>} variables The array of variables
 *     to use when extracting values from the GLSL program.
 * @param {number} viewportHeight The height of context's canvas.
 * @param {number} viewportWidth The width of context's canvas.
 * @constructor
 */
glslunit.Executor = function(
    context, sourceAst, variables, viewportHeight, viewportWidth) {
  /**
   * The WebGL context.
   * @type {!WebGLRenderingContext}
   * @protected
   */
  this.context = context;

  /**
   * The AST of the GLSL Code to be executed in ExtractValue.
   * @type {!Object}
   * @protected
   */
  this.sourceAst = sourceAst;

  /**
   * Array of variables to use when extracting values.
   * @type {!Array.<glslunit.ShaderVariable>}
   * @protected
   */
  this.variables = variables;

  /**
   * The height of context's canvas.
   * @type {number}
   * @protected
   */
  this.viewportHeight = viewportHeight;

  /**
   * The width of context's canvas.
   * @type {number}
   * @protected
   */
  this.viewportWidth = viewportWidth;

  /**
   * A Map of all variables that were renamed from their original names to their
   * new names.  A variable might be renamed if it was a reference to a built in
   * variable to allow the developer the ability to specify its value.
   * @type {!Object}
   * @protected
   */
  this.renameMap = {};
};


/**
 * The decoding status if valid number wasn't returned.
 * @enum {string}
 */
glslunit.Executor.DecodeStatus = {
  DISCARD: 'discard',
  MISMATCH: 'mismatch'
};


/**
 * The number of test vertices.
 * @type {number}
 */
glslunit.Executor.TEST_VERTEX_COUNT = 3;


/**
 * Source code for the triangle used to render the value being extracted.
 * @type {string}
 * @const
 */
glslunit.Executor.testTriangleSource = 'attribute vec3 aTestTriangle;';


/**
 * The GLSL source code for a function which will encode an
 * arbitrary float in color.
 * @type {string}
 * @private
 * @const
 */
glslunit.Executor.encodeFloatSource_ =
    'precision highp float;' +
    'float upper_mask(float val, float n) {' +
    '  float nShifted = exp2(n);' +
    '  return fract(val/(nShifted))*nShifted;' +
    '}' +
    'vec4 encodeFloat(float f) {' +
    '  const vec4 coding = vec4(1.0/255.0,' +
    '                           255.0/256.0,' +
    '                           65025.0/256.0,' +
    '                           16581375.0/256.0);' +
    '  vec4 result;' +
    '  bool sign = f >= 0.0;' +
    '  f = abs(f);' +
    // Max is here to work around a HLSL Bug detailed here:
    // http://forums.create.msdn.com/forums/p/32167/184067.aspx
    // Since we can't rely on the user to have the correct version of DirectX,
    // we're working around the issue.
    // In general, if f is 0, we don't care what the value of expField is since
    // the mantissa will also be zero.
    '  float expField = ceil(log2(max(f, 1e-32)));' +
    '  f = f / exp2(expField);' +
    '  result.r = ((float(sign) * 32.) + (upper_mask((expField + 16.), 5.)))' +
    '     * 4. + 2.;' +
    '  result.gba = vec3(f, f, f);' +
    '  result = fract(result * coding);' +
    '  result = floor(result * 255.0)/255.0;' +
    '  return result;' +
    '}';


/**
 * The AST for the encodeFloat function.
 * @type {!Object}
 * @private
 * @const
 */
glslunit.Executor.encodeFloatAst_ =
    glslunit.glsl.parser.parse(glslunit.Executor.encodeFloatSource_);


/**
 * Decodes a float from a color.
 * r:
 *  7: sign bit
 *  6 - 2: exponential
 *  1 - 0: “10”, set to be a buffer against rounding errors.  We use two buffer
 *    bits to protect against rounding up and down
 * g-a: mantissa
 * @param {!Uint8Array} buffer Color data read back with readPixels.
 * @nosideeffects
 * @return {glslunit.ExtractedValue} The decoded float value.  If -0 was
 *     decoded, we know that the shader discarded so we return 'discard'.
 */
glslunit.Executor.decodeFloat = function(buffer) {
  // When we encode the float, we only store values in the mantissa channels
  // from 0-(255.0/256.0).  We do this because otherwise, channels could
  // overlap.  Storing 1/255.0 would result in (1, 255, 0) in the gba channels
  // since both g and b can represent 1/255.  We use this fixed value to prevent
  // overlap.
  var fromFixed = 256.0 / 255.0;
  var values = [];
  values[0] = buffer[0] >> 2;
  values[1] = buffer[1] / 255.0;
  values[2] = buffer[2] / 255.0;
  values[3] = buffer[3] / 255.0;
  var sign = Number((values[0] & 0x00000020) > 0);
  var expField = Number(values[0] & 0x0000001F) - 16;
  var mantissa = Number(values[1] * fromFixed / 1.0 +
      values[2] * fromFixed / 255.0 +
      values[3] * fromFixed / (255.0 * 255.0));
  if (mantissa == 0 && sign == 0) {
    // Decoded -0, which is used to signal that the shader discarded.
    return glslunit.Executor.DecodeStatus.DISCARD;
  }
  return (-1 + sign * 2) * Math.pow(2, expField) * mantissa;
};


/**
 * Compiles a GLSL shader and returns it.
 * @param {!Object} shaderAst AST for the shader to compile.
 * @param {number} shaderType The type of shader being compiled.
 * @return {!WebGLShader} The compiled shader.
 * @throws {Error} If shader couldn't be compiled.
 * @private
 */
glslunit.Executor.prototype.compileShader_ = function(shaderAst, shaderType) {
  var shader =
      /** @type {!WebGLShader} */ (this.context.createShader(shaderType));
  var shaderSource = glslunit.Generator.getSourceCode(shaderAst, '\n', true);
  this.context.shaderSource(shader, shaderSource);
  this.context.compileShader(shader);
  if (!this.context.getShaderParameter(shader, this.context.COMPILE_STATUS)) {
    var errorMessage = this.context.getShaderInfoLog(shader);
    throw Error('Couldn\'t compile shader: ' + errorMessage +
                '\n' + shaderSource);
  }
  return shader;
};


/**
 * Compiles the vertex and fragment shaders, links them into a program, and uses
 * that program.
 * @param {!Object} vertexAst AST for the vertex shader.
 * @param {!Object} fragmentAst AST for the fragment shader.
 * @return {!WebGLProgram} The WebGLProgram created from the two input shader
 *     programs.
 * @private
 */
glslunit.Executor.prototype.setupShaderPrograms_ = function(
    vertexAst, fragmentAst) {
  var vshader = this.compileShader_(vertexAst, this.context.VERTEX_SHADER);
  var fshader = this.compileShader_(fragmentAst, this.context.FRAGMENT_SHADER);

  var shaderProgram = /** @type {!WebGLProgram} */
      (this.context.createProgram());
  this.context.attachShader(shaderProgram, vshader);
  this.context.attachShader(shaderProgram, fshader);
  this.context.linkProgram(shaderProgram);
  this.context.useProgram(shaderProgram);
  return shaderProgram;
};


/**
 * Prepends the encoding function to the AST of a target shader.
 * @param {!Object} targetAst The AST to prepend the encoding function to.
 * @return {!Object} The root of the new AST with the prepended encoding
 *     function.
 * @private
 */
glslunit.Executor.addEncodeFunction_ = function(targetAst) {
  return glslunit.SpliceTransformer.splice(targetAst, targetAst,
      'statements', 0, 0, glslunit.Executor.encodeFloatAst_.statements);
};


/**
 * Prepares an AST for extraction by renaming any main functions and adding the
 * extraction code.
 * @return {{testAst: !Object, foundMain: boolean}}
 *     testAst is the ast prepared for testing.
 *     foundMain is True if a main function was found, false otherwise.
 * @protected
 */
glslunit.Executor.prototype.prepareAst = function() {
  // Rename 'main'
  var mainPrototype = glslunit.glsl.parser.parse('void main()',
                                                 'function_prototype');
  var mainRenamer = new glslunit.FunctionRenameTransformer(mainPrototype,
                                                           '__testMain');
  var testAst = mainRenamer.transformNode(this.sourceAst);
  var foundMain = testAst != this.sourceAst;

  // Add extraction code.
  testAst = glslunit.Executor.addEncodeFunction_(testAst);
  return {testAst: testAst, foundMain: foundMain};
};


/**
 * Gets the vertex shader GLSL program to use when extracting data.  It is
 * required that the instrumented vertex shader accept a vec3 attribute
 * 'aTestTriangle' and set gl_Position to vec4(aTestTriangle, 1.).
 * @param {!Object} extractionTargetAst AST for the value to be extracted.  This
 *     should evaluate to a single float.
 * @return {!Object} The instrumented AST.
 * @protected
 */
glslunit.Executor.prototype.getVertexAst = goog.abstractMethod;


/**
 * Gets the fragment shader GLSL program to use when extracting data.  The
 * fragment shader should set gl_FragColor to the encoded result of
 * extractionTargetAst.
 * @param {!Object} extractionTargetAst AST for the value to be extracted.  This
 *     should evaluate to a single float.
 * @return {!Object} The instrumented AST.
 * @protected
 */
glslunit.Executor.prototype.getFragmentAst = goog.abstractMethod;


/**
 * Initializes the current WebGLContext to be used with testing.
 * @private
 */
glslunit.Executor.prototype.initContext_ = function() {
  this.context.clearColor(0.0, 0.0, 0.0, 0.0);
  this.context.enable(this.context.DEPTH_TEST);
  this.context.viewport(0, 0, this.viewportWidth, this.viewportHeight);
  this.context.clear(this.context.COLOR_BUFFER_BIT |
                     this.context.DEPTH_BUFFER_BIT);
};


/**
 * Creates and uploads the test variables needed for extraction.
 * @param {!Object} vertexAst The AST for the vertex shader.
 * @param {!Object} fragmentAst The AST for the fragment shader.
 * @param {!WebGLProgram} shaderProgram The shader program to extract a value
 *     from.
 * @return {!glslunit.NumberShaderVariable} The buffer for the test triangle.
 * @private
 */
glslunit.Executor.prototype.createTestVariables_ = function(
    vertexAst, fragmentAst, shaderProgram) {
  var globalVariables =
      glslunit.VariableScopeVisitor.getVariablesInScope(vertexAst,
                                                        vertexAst,
                                                        true);

  // We need to gather any uniform variables declared in the fragment shader.
  var fragmentVariables =
      glslunit.VariableScopeVisitor.getVariablesInScope(fragmentAst,
                                                        fragmentAst,
                                                        true);

  for (var i in fragmentVariables) {
    if (fragmentVariables[i].typeAttribute.qualifier == 'uniform') {
      globalVariables[i] = fragmentVariables[i];
    }
  }

  // Buffer any variables.
  var textureCount = 0;
  goog.array.forEach(this.variables, function(variable) {
    // The shader program may have optimized away this variable.  Don't buffer
    // anything for it in this case.
    variable.setGlobalVariables(globalVariables, this.renameMap);
    if (variable.getLocation(this.context, shaderProgram) != null) {
      variable.bufferData(this.context, shaderProgram,
                          glslunit.Executor.TEST_VERTEX_COUNT, textureCount);
      if (variable.getIsTexture()) {
        textureCount++;
      }
    }
  }, this);

  // Buffer the test triangle.
  var testTriangle = new glslunit.NumberShaderVariable('aTestTriangle', null);
  var testVerticies = [
      -1.0,  1.0, 0.0,
      -1.0, -1.0, 0.0,
       1.0,  1.0, 0.0
  ];
  testTriangle.setGlobalVariables(globalVariables, this.renameMap);
  testTriangle.bufferAttribute(this.context, shaderProgram,
                               glslunit.Executor.TEST_VERTEX_COUNT,
                               new Float32Array(testVerticies));

  goog.array.forEach(this.variables, function(variable) {
    if (variable.getLocation(this.context, shaderProgram) != null) {
      variable.bindData(this.context, shaderProgram);
    }
  }, this);
  testTriangle.bindData(this.context, shaderProgram);
  return testTriangle;
}

/**
 * Executes the test GLSL program and extracts a value from it.
 * @param {!Object} extractionTargetAst AST for the value to be extracted.  This
 *     should evaluate to a single float.
 * @param {number=} opt_decodeCorner Which corner to decode.  If
 *     opt_decodeCorner is set, mismatches between corners will be ignored and
 *     the value at the corner specified will be returned.  Should be [0-2].
 * @return {glslunit.ExtractedValue} The value extracted from running the
 *     test GLSL program or the error returned from decoding.
 * @throws {Error} Throws an exception containing the error text if any of the
 *     underlying WebGL calls have an error.
 */
glslunit.Executor.prototype.extractValue = function(
    extractionTargetAst, opt_decodeCorner) {
  var shaderProgram;
  try {
    var vertexAst = this.getVertexAst(extractionTargetAst);
    var fragmentAst = this.getFragmentAst(extractionTargetAst);
    shaderProgram = this.setupShaderPrograms_(vertexAst, fragmentAst);

    this.initContext_();

    var testTriangle = this.createTestVariables_(vertexAst,
                                                 fragmentAst,
                                                 shaderProgram);

    // Draw the test GLSL.
    this.context.drawArrays(this.context.TRIANGLE_STRIP, 0,
                            glslunit.Executor.TEST_VERTEX_COUNT);

    // Extract the value.
    var corners = [new Uint8Array(4), new Uint8Array(4), new Uint8Array(4)];
    this.context.readPixels(0, 1, 1, 1,
                            this.context.RGBA, this.context.UNSIGNED_BYTE,
                            corners[0]);
    this.context.readPixels(0, this.viewportHeight - 1, 1, 1,
                            this.context.RGBA, this.context.UNSIGNED_BYTE,
                            corners[1]);
    this.context.readPixels(this.viewportWidth - 2, this.viewportHeight - 1,
                            1, 1,
                            this.context.RGBA, this.context.UNSIGNED_BYTE,
                            corners[2]);
    var arraysMatch = goog.array.equals(corners[0], corners[1]) &&
                      goog.array.equals(corners[0], corners[2]);
    // We use isDef here because opt_decodeCorner is a number, and 0 is a
    // perfectly valid input.
    if (!goog.isDef(opt_decodeCorner) && !arraysMatch) {
      return glslunit.Executor.DecodeStatus.MISMATCH;
    } else {
      return glslunit.Executor.decodeFloat(corners[opt_decodeCorner || 0]);
    }
  } finally {
    goog.array.forEach(this.variables, function(variable) {
      variable.cleanUp(this.context);
    }, this);
    if (shaderProgram) {
      this.context.deleteProgram(shaderProgram);
    }
    if (testTriangle) {
      testTriangle.cleanUp(this.context);
    }
  }
};
