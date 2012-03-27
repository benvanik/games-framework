// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Interface for defining compiler steps.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.CompilerStep');

goog.require('glslunit.compiler.ShaderProgram');



/**
 * An interface for declaring compiler steps.
 * @interface
 */
glslunit.compiler.CompilerStep = function() {};


/**
 * Gets the name of this compiler step.
 * @return {string} The name of this compiler step.
 */
glslunit.compiler.CompilerStep.prototype.getName = function() {};


/**
 * Gets the list of compiler steps this step depends on.
 * @return {Array.<string>} The list of Compiler Steps this step depends on.
 */
glslunit.compiler.CompilerStep.prototype.getDependencies = function() {};


/**
 * Performs this compilation step.
 * @param {Object.<string, !Object>} stepOutputMap Map of compilation step names
 *      to their output data.
 * @param {glslunit.compiler.ShaderProgram} shaderProgram The program to be
 *     compiled.  This shaderProgram will be transformed in place.
 * @return {Object} A set of additional information output by the compiler step
 *     that can be used by later compiler steps.
 */
glslunit.compiler.CompilerStep.prototype.performStep =
    function(stepOutputMap, shaderProgram) {};
