// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the FunctionMinifier.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.FunctionMinifier');
goog.require('glslunit.glsl.parser');
goog.require('goog.testing.jsunit');



function setUp() {
  inputSource =
    'float someMethod(const int foo, float bar);' +
    'void anotherMethod(){}' +
    'void methodOrVariable(){}' +
    'void main() {' +
    '  int leaveMe;' +
    '  int methodOrVariable;' +
    '  anotherMethod();' +
    '  someMethod(1, 4.2);' +
    '}' +
    'float someMethod(const int foo, float bar) {' +
    '  return bar + float(foo) + 12.4;' +
    '}';
}



function testFunctionMinifier() {
  var expectedSource =
    'float a(const int foo,float bar);' +
    'void b(){}' +
    'void c(){}' +
    'void main(){' +
    'int leaveMe;' +
    'int methodOrVariable;' +
    'b();' +
    'a(1,4.2);' +
    '}' +
    'float a(const int foo,float bar){' +
    'return bar+float(foo)+12.4;' +
    '}';
  var minifier = new glslunit.compiler.FunctionMinifier();
  var inputNode = glslunit.glsl.parser.parse(inputSource);
  var newNode = minifier.transformNode(inputNode);
  assertNotEquals(inputNode, newNode);
  assertEquals('foo', inputNode.statements[0].parameters[0].name);
  assertEquals(expectedSource, glslunit.Generator.getSourceCode(newNode));
}
