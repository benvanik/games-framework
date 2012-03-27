// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Compiler used for demonstration purposes.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.DemoCompiler');

goog.require('glslunit.compiler.BraceReducer');
goog.require('glslunit.compiler.ConstructorMinifier');
goog.require('glslunit.compiler.DeadFunctionRemover');
goog.require('glslunit.compiler.DeclarationConsolidation');
goog.require('glslunit.compiler.FunctionMinifier');
goog.require('glslunit.compiler.GlslPreprocessor');
goog.require('glslunit.compiler.VariableMinifier');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.compiler.Compiler');
goog.require('glslunit.glsl.parser');

glslunit.compiler.DemoCompiler = function(vertexSource, fragmentSource) {
  this.fragmentSource_ = fragmentSource;
  this.vertexSource_ = vertexSource;
}

glslunit.compiler.DemoCompiler.prototype.compileProgram = function() {
  var shaderProgram = new glslunit.compiler.ShaderProgram();
  shaderProgram.vertexAst = glslunit.glsl.parser.parse(this.vertexSource_,
                                                       'vertex_start');
  shaderProgram.fragmentAst = glslunit.glsl.parser.parse(this.fragmentSource_,
                                                         'fragment_start');

  var compiler = new glslunit.compiler.Compiler(shaderProgram);
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
        new glslunit.compiler.GlslPreprocessor(
            [], ['GL_ES 1'], true, true));
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.BraceReducer());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.ConstructorMinifier());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.DeadFunctionRemover());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.DeclarationConsolidation(true));
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.VariableMinifier(false));
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
                        new glslunit.compiler.FunctionMinifier());

  shaderProgram = compiler.compileProgram();

  return shaderProgram;
}
