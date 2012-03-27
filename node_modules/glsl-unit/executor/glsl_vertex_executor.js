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
 * @fileoverview Executor for vertex shaders.  The Executors are responsible
 * for running a GLSL vertex program and extracting values for them.  The
 * VertexExecutor is responsible for extracting data from vertex GLSL programs.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.VertexExecutor');

goog.require('glslunit.Executor');
goog.require('glslunit.FunctionRenameTransformer');
goog.require('glslunit.Generator');
goog.require('glslunit.SpliceTransformer');
goog.require('goog.string.format');



/**
 * Constructs a VertexExecutor.
 * @param {!WebGLRenderingContext} context The WebGL context.
 * @param {!Object} sourceAst The AST of the GLSL code we want to execute and
 *     extract a value from.
 * @param {!Array.<glslunit.ShaderVariable>} variables The array of variables to
 *     use when extracting values from the GLSL program.
 * @param {number} viewportHeight The height of context's canvas.
 * @param {number} viewportWidth The width of context's canvas.
 * @constructor
 * @extends {glslunit.Executor}
 */
glslunit.VertexExecutor = function(context,
                                   sourceAst,
                                   variables,
                                   viewportHeight,
                                   viewportWidth) {
  goog.base(this, context, sourceAst, variables, viewportHeight, viewportWidth);
};
goog.inherits(glslunit.VertexExecutor, glslunit.Executor);

/**
 * Source code for varying we use to store the encoded result color.
 * @type {string}
 * @const
 * @private
 */
glslunit.VertexExecutor.resultColorSource_ =
  'varying vec4 vResultColor;';


/**
 * AST for varying we use to store the encoded result color.
 * @type {!Object}
 * @const
 * @private
 */
glslunit.VertexExecutor.resultColorAst_ =
  glslunit.glsl.parser.parse(glslunit.VertexExecutor.resultColorSource_,
                             'global_declaration');


/**
 * Source code for fragment shader that outputs result values.
 * @type {string}
 * @const
 * @private
 */
glslunit.VertexExecutor.fragmentSource_ =
  'precision highp float;' +
  glslunit.VertexExecutor.resultColorSource_ +
  'void main(void) {' +
  '  gl_FragColor = vResultColor;' +
  '}';


/**
 * The AST for the fragment source code.
 * @type {!Object}
 * @const
 * @private
 */
glslunit.VertexExecutor.fragmentAst_ = glslunit.glsl.parser.parse(
    glslunit.VertexExecutor.fragmentSource_,
    'fragment_start');


/** @inheritDoc */
glslunit.VertexExecutor.prototype.getVertexAst = function(extractionTargetAst) {
  var prepareResult = this.prepareAst();
  var testAst = prepareResult.testAst;
  var foundMain = prepareResult.foundMain;

  // Add result color
  var testAst = glslunit.SpliceTransformer.splice(testAst, testAst,
    'statements', 0, 0, [glslunit.VertexExecutor.resultColorAst_]);

  // Create the new main function
  var mainFunc = goog.string.format(
    glslunit.Executor.testTriangleSource +
    'void main() {' +
    (foundMain ? '  __testMain();' : '') +
    '  vResultColor = encodeFloat(float(%s));' +
    '  gl_Position = vec4(aTestTriangle, 1.);' +
    '}', glslunit.Generator.getSourceCode(extractionTargetAst));
  var mainAst = glslunit.glsl.parser.parse(mainFunc, 'vertex_start');

  [].push.apply(testAst.statements, mainAst.statements);
  return testAst;
};


/** @inheritDoc */
glslunit.VertexExecutor.prototype.getFragmentAst = function(extractionTargetAst)
{
  return glslunit.VertexExecutor.fragmentAst_;
};
