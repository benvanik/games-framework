// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Preprocesses .glsl and .glslib files for use in the compiler.
 *     Takes in the contents of a glsl file and all known library files.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.compiler.BasicCompiler');

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.Compiler');
goog.require('glslunit.compiler.DeadFunctionRemover');
goog.require('glslunit.compiler.DeclarationConsolidation');
goog.require('glslunit.compiler.FunctionMinifier');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.compiler.VariableMinifier');
goog.require('glslunit.glsl.parser');
goog.require('goog.node.FLAGS');
goog.require('goog.object');

var path = require('path');
var fs = require('fs');

goog.node.FLAGS.define_string('vertex_source', '', 'The input vertex GLSL.');
goog.node.FLAGS.define_string('fragment_source', '',
                              'The input fragment GLSL.');

goog.node.FLAGS.parseArgs();


/**
 * Set of valid GLSL extensions.
 * @type {Object.<string, boolean>}
 * @const
 */
var GLSL_EXTENSIONS = {
  '.glsl': true,
  '.glsllib': true
};


function main() {
  var inputDirectories = [path.dirname(goog.node.FLAGS['input'])];
  var vertexSource = fs.readFileSync(goog.node.FLAGS['vertex_source'], 'utf8');
  var fragmentSource = fs.readFileSync(goog.node.FLAGS['fragment_source'],
                                       'utf8');

  var shaderProgram = new glslunit.compiler.ShaderProgram();
  try {
    shaderProgram.vertexAst = glslunit.glsl.parser.parse(vertexSource,
                                                         'vertex_start');
    shaderProgram.fragmentAst = glslunit.glsl.parser.parse(fragmentSource,
                                                           'fragment_start');
  } catch (e) {
    console.error(e);
    return;
  }

  var compiler = new glslunit.compiler.Compiler(shaderProgram);

  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.DeadFunctionRemover());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.DeclarationConsolidation(true));
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.VariableMinifier(false));
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.FunctionMinifier());

  shaderProgram = compiler.compileProgram();

  var resultString =
     '\n//! VERTEX\n' +
      glslunit.Generator.getSourceCode(shaderProgram.vertexAst,
                                       '\\n') +
      '\n//! FRAGMENT\n' +
      glslunit.Generator.getSourceCode(shaderProgram.fragmentAst,
                                       '\\n');
  process.stdout.write(resultString);
}

main();
