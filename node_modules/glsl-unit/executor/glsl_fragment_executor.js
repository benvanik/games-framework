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
 * @fileoverview Executor for fragment shaders.  The Executors are responsible
 * for running a GLSL vertex program and extracting values for them.  The
 * FragmentExecutor is responsible for extracting data from fragment
 * GLSL programs.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.FragmentExecutor');

goog.require('glslunit.Executor');
goog.require('glslunit.FunctionRenameTransformer');
goog.require('glslunit.Generator');
goog.require('glslunit.IdentifierRenameTransformer');
goog.require('glslunit.NodeCollector');
goog.require('glslunit.QualifierTransformer');
goog.require('glslunit.SpliceTransformer');
goog.require('glslunit.utils');
goog.require('goog.string.format');



/**
 * Constructs a FragmentExecutor.
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
glslunit.FragmentExecutor = function(context,
                                     sourceAst,
                                     variables,
                                     viewportHeight,
                                     viewportWidth) {
  var currentAst = sourceAst;

  // Rename any builtin global access.
  var nameMap = {};
  goog.array.forEach(glslunit.utils.BUILT_IN_GLOBALS, function(globalAst) {
    var globalName = globalAst.declarators[0].name.name;
    var newName = '__' + globalName;
    var nextAst =
      glslunit.IdentifierRenameTransformer.renameVariable(currentAst,
                                                          globalName,
                                                          newName);
    if (nextAst != currentAst) {
      // Explicitly declare the built in global and then rename all occurrences
      // of it.
      nextAst = glslunit.SpliceTransformer.splice(nextAst, nextAst,
                                                 'statements', 0, 0,
                                                 [globalAst]);
      nextAst = glslunit.IdentifierRenameTransformer.renameVariable(nextAst,
                                                                    globalName,
                                                                    newName);
      nameMap[globalName] = newName;
    }
    currentAst = nextAst;
  });


  // Intercept the AST and re-write all varyings as uniforms.
  // TODO(rowillia): It's possible we'll overflow the maximum allowed uniforms
  // here.  We should check this, or better yet compile these variables in as
  // const values.
  var qualifierTransformer = new glslunit.QualifierTransformer(
    'varying', 'uniform');
  currentAst = qualifierTransformer.transformNode(currentAst);

  goog.base(this, context, currentAst, variables,
            viewportHeight, viewportWidth);

  // Add all of the globals that were renames to the rename map.
  for (var i in nameMap) {
    this.renameMap[i] = nameMap[i];
  }
};
goog.inherits(glslunit.FragmentExecutor, glslunit.Executor);


/**
 * Source code for vertex shader that simply passes through the test triangle.
 * @type {string}
 * @const
 * @private
 */
glslunit.FragmentExecutor.vertexSource_ =
  glslunit.Executor.testTriangleSource +
  'void main(void) {' +
  '  gl_Position = vec4(aTestTriangle, 1.);' +
  '}';


/**
 * The AST for the vertex source code.
 * @type {!Object}
 * @const
 * @private
 */
glslunit.FragmentExecutor.vertexAst_ = glslunit.glsl.parser.parse(
    glslunit.FragmentExecutor.vertexSource_,
    'vertex_start');


/** @inheritDoc */
glslunit.FragmentExecutor.prototype.getFragmentAst =
    function(extractionTargetAst) {

  var prepareResult = this.prepareAst();
  var testAst = prepareResult.testAst;
  var foundMain = prepareResult.foundMain;

  // Create the new main function
  var mainFunc = goog.string.format(
    'void main() {' +
    (foundMain ? '  __testMain();' : '') +
    '  gl_FragColor = encodeFloat(float(%s));' +
    '}', glslunit.Generator.getSourceCode(extractionTargetAst));
  var mainAst = glslunit.glsl.parser.parse(mainFunc, 'fragment_start');

  [].push.apply(testAst.statements, mainAst.statements);
  return testAst;
};


/** @inheritDoc */
glslunit.FragmentExecutor.prototype.getVertexAst = function(extractionTargetAst)
{
  return glslunit.FragmentExecutor.vertexAst_;
};
