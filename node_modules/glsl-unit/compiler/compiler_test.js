// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the Compiler.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.compiler.Compiler');
goog.require('glslunit.compiler.CompilerStep');
goog.require('goog.testing.jsunit');

function setUp() {
  nextExecutionCount = 0;
}

/**
 * A Fake compiler step for testing.
 */
fakeStepGenerator = function(name, dependencies) {
  this.executionOrder = -1;
  this.executionCount = 0;
  this.name = name;
  this.dependencies = dependencies;
  var parent = this;
  this.step = function() {
    this.getName = function() {
      return parent.name;
    }
    this.getDependencies = function() {
      return parent.dependencies;
    }
    this.performStep = function(shaderProgram, stepOutputMap) {
      parent.executionOrder = nextExecutionCount++;
      parent.executionCount++;
      return {};
    }
  }
};

function testNoSteps() {
  var shaderProgram = {};
  var compiler = new glslunit.compiler.Compiler(shaderProgram);
  assertEquals(shaderProgram, compiler.compileProgram());
}


function testCompilation() {
  var shaderProgram = {};
  var compiler = new glslunit.compiler.Compiler(shaderProgram);
  var opStep = new fakeStepGenerator('opStep1', []);
  var secondOpStep = new fakeStepGenerator('opStep2', ['opStep1']);
  var minStep = new fakeStepGenerator('minStep', []);
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.OPTIMIZATION,
                        new secondOpStep.step());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.OPTIMIZATION,
                        new opStep.step());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.OPTIMIZATION,
                        new minStep.step());
  assertEquals(shaderProgram, compiler.compileProgram());
  assertEquals(0, opStep.executionOrder);
  assertEquals(1, opStep.executionCount);
  assertEquals(1, secondOpStep.executionOrder);
  assertEquals(1, secondOpStep.executionCount);
  assertEquals(2, minStep.executionOrder);
  assertEquals(1, minStep.executionCount);
}

function testLoop() {
  var shaderProgram = {};
  var compiler = new glslunit.compiler.Compiler(shaderProgram);
  var opStep = new fakeStepGenerator('opStep1', ['minStep']);
  var secondOpStep = new fakeStepGenerator('opStep2', ['opStep1']);
  var minStep = new fakeStepGenerator('minStep', ['opStep2']);
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.OPTIMIZATION,
                        new secondOpStep.step());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.OPTIMIZATION,
                        new opStep.step());
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.OPTIMIZATION,
                        new minStep.step());
  var errorMessage = 'Circular dependcy in compiler steps.  ' +
      'opStep2->opStep1->minStep->opStep2';
  assertThrows(errorMessage, function() {compiler.compileProgram();});
}
