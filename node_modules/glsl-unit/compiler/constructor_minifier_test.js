// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the ConstructorMinifier.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.ConstructorMinifier');
goog.require('glslunit.glsl.parser');
goog.require('goog.testing.jsunit');



function setUp() {
  inputSource =
      'vec4 foo = vec4(1.2, 2.1, 3.+2., 3.001);' +
      'vec4 bar = vec4(1.2, 0., 3.2, 3.001);' +
      'vec4 meh = vec4(1.2, 1., 1.2, 1.);' +
      'bvec2 raz = bvec2(false, true);' +
      'ivec3 baz = ivec3(1., 1, 1);' +
      'mat2 m2 = mat2(vec3(1),1);' +
      'mat2 m2a = mat2(1,1,1,1);' +
      'mat2 m2b = mat2(41,0,0,41.0);' +
      'mat2 m2c = mat2(41,vec2(0),41.0);' +
      'mat2 m2d = mat2(41,vec2(0,0),41.0);' +
      'mat2 m2e = mat2(41,vec2(1,0),41.0);';
}


function testConstructorMinifier() {
  var expectedSource =
      'vec4 foo=vec4(1.2,2.1,3.+2.,3.001);' +
      'vec4 bar=vec4(1.2,0,3.2,3.001);' +
      'vec4 meh=vec4(1.2,1,1.2,1);' +
      'bvec2 raz=bvec2(0,1);' +
      'ivec3 baz=ivec3(1);' +
      'mat2 m2=mat2(vec3(1),1);' +
      'mat2 m2a=mat2(1,1,1,1);' +
      'mat2 m2b=mat2(41);' +
      'mat2 m2c=mat2(41,vec2(0),41);' +
      'mat2 m2d=mat2(41);' +
      'mat2 m2e=mat2(41,1,0,41);';
  var minifier = new glslunit.compiler.ConstructorMinifier();
  var inputNode = glslunit.glsl.parser.parse(inputSource);
  var newNode = minifier.transformNode(inputNode);
  assertNotEquals(inputNode, newNode);
  assertEquals(expectedSource, glslunit.Generator.getSourceCode(newNode));
}
