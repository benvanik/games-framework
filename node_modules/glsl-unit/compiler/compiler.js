// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview GLSL Shader Compiler which.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.Compiler');

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('goog.array');



/**
 * A Compiler for GLSL programs.
 * @param {glslunit.compiler.ShaderProgram} shaderProgram The shader program to
 *     compile.
 * @constructor
 */
glslunit.compiler.Compiler = function(shaderProgram) {
  /**
   * Array mapping phases to the steps declared inside of those phases.
   * @type {Object.<glslunit.compiler.Compiler.CompilerPhase,
   *                Array.<glslunit.compiler.CompilerStep>>}
   * @private
   */
  this.phaseToSteps_ = {};

  /**
   * The shader program being optimized.
   * @type {glslunit.compiler.ShaderProgram}
   * @private
   */
  this.shaderProgram_ = shaderProgram;

  /**
   * Map of steps to their output data.
   * @type {!Object.<string, Object>}
   * @private
   */
  this.stepOutputs_ = {};

  /**
   * Map of step names to their registered steps.
   * @type {!Object.<string, glslunit.compiler.CompilerStep>}
   * @private
   */
  this.registeredSteps_ = {};

  // Initialize the phase array.
  goog.array.forEach(glslunit.compiler.Compiler.CompilerPhase.PHASE_ORDER_,
                     function(phase) {
    this.phaseToSteps_[phase] = [];
  }, this);
};

/**
 * Declaration of different compiler phases.
 * @enum {number}
 */
glslunit.compiler.Compiler.CompilerPhase = {
  OPTIMIZATION: 0,
  MINIFICATION: 1
};


/**
 * The order in which to run compiler phases.
 * @type {Array.<glslunit.compiler.Compiler.CompilerPhase>}
 * @private
 * @const
 */
glslunit.compiler.Compiler.CompilerPhase.PHASE_ORDER_ = [
  glslunit.compiler.Compiler.CompilerPhase.OPTIMIZATION,
  glslunit.compiler.Compiler.CompilerPhase.MINIFICATION
];

/**
 * Registers a CompilerStep to be used when compiling the shader program.
 * @param {glslunit.compiler.Compiler.CompilerPhase} phase Which phase to run
 *     this step during.
 * @param {glslunit.compiler.CompilerStep} compilerStep The compiler step being
 *     registered.
 */
glslunit.compiler.Compiler.prototype.registerStep =
    function(phase, compilerStep) {
  this.registeredSteps_[compilerStep.getName()] = compilerStep;
  this.phaseToSteps_[phase].push(compilerStep);
};


/**
 * Compiles the shader program this compiler was constructed with.
 * @return {glslunit.compiler.ShaderProgram} The compiled shader program.
 */
glslunit.compiler.Compiler.prototype.compileProgram = function() {
  goog.array.forEach(glslunit.compiler.Compiler.CompilerPhase.PHASE_ORDER_,
                     function(phase) {
    var phaseSteps = this.phaseToSteps_[phase];
    goog.array.forEach(phaseSteps, function(step) {
      this.runStep_(step, []);
    }, this);
  }, this);
  return this.shaderProgram_;
};


/**
 * Executes a compiler step and all of it's dependencies if this step hasn't
 *     been executed yet.
 * @param {glslunit.compiler.CompilerStep} step The constructor
 *     for compiler step to be run.
 * @param {Array.<string>} stepStack The stack of currently executing steps.
 * @private
 */
glslunit.compiler.Compiler.prototype.runStep_ =
    function(step, stepStack) {
  var stepName = step.getName();
  var nextStepStack = stepStack.concat(stepName);
  if (stepStack.indexOf(stepName) != -1) {
    var dependsText = nextStepStack.join('->');
    throw 'Circular dependcy in compiler steps.  ' + dependsText;
  }
  // If this step hasn'be been executed yet, it won't have any output stored
  // so we can check for the presense of output to check if the step has already
  // run.
  if (!(stepName in this.stepOutputs_)) {
    goog.array.forEach(step.getDependencies(), function(dependency) {
      if (dependency in this.registeredSteps_) {
        this.runStep_(this.registeredSteps_[dependency], nextStepStack);
      }
    }, this);
    this.stepOutputs_[stepName] = step.performStep(this.stepOutputs_,
                                                   this.shaderProgram_);
  }
};
