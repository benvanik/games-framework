// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the FunctionMinifier.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.compiler.VariableMinifier');
goog.require('glslunit.glsl.parser');
goog.require('goog.testing.jsunit');


/**
 * Implement Object.keys for FF3...
 * @param {Object} obj Object we're getting the keys for.
 * @return {Array.<string>} Array of keys for obj.
 */
Object.keys = function(obj) {
  var result = [];
  for (var i in obj) {
    result.push(i);
  }
  return result;
};



function setUp() {
  vertexSource =
    'float someMethod(const int foo, float bar);' +
    'struct someStruct{' +
    '  int field1, field2;' +
    '  vec2 field3;' +
    '};' +
    'attribute vec3 attr, anotherAttr;' +
    'void methodOrVariable(){}' +
    'uniform float uGlobal;' +
    'varying vec3 vOutput;' +
    'void main() {' +
    '  int someVariable;' +
    '  int methodOrVariable;' +
    '  vec2 vector;' +
    '  anotherMethod();' +
    '  someMethod(1, 4.2);' +
    '}' +
    'float someMethod(const int foo, float bar) {' +
    '  vec2 vector;' +
    '  return attr + methodOrVariable + bar + float(foo) + 12.4;' +
    '}';
  fragmentSource =
    'mat2 global1, global2, global3, global4;' +
    'uniform float uGlobal;' +
    'mat3 someOtherGlobal;' +
    'varying vec3 vOutput;' +
    'void main() {}';
}



function testVariableMinifier() {
  var expectedVertex =
    'float someMethod(const int e,float f);' +
    'struct someStruct{' +
    'int field1,field2;' +
    'vec2 field3;' +
    '};' +
    'attribute vec3 c,d;' +
    'void methodOrVariable(){}' +
    'uniform float a;' +
    'varying vec3 b;' +
    'void main(){' +
    'int e;' +
    'int f;' +
    'vec2 g;' +
    'anotherMethod();' +
    'someMethod(1,4.2);' +
    '}' +
    'float someMethod(const int e,float f){' +
    'vec2 g;' +
    'return c+methodOrVariable+f+float(e)+12.4;' +
    '}';
  var expectedFragment =
    'mat2 c,d,e,f;' +
    'uniform float a;' +
    'mat3 g;' +
    'varying vec3 b;' +
    'void main(){}';
  var minifier = new glslunit.compiler.VariableMinifier(true);

  var vertexAst = glslunit.glsl.parser.parse(vertexSource);
  var fragmentAst = glslunit.glsl.parser.parse(fragmentSource);

  var vertexResult = minifier.transformNode(vertexAst);
  assertEquals(expectedVertex,
               glslunit.Generator.getSourceCode(vertexResult));

  var renamer = minifier.currentNameGenerator_;
  minifier = new glslunit.compiler.VariableMinifier(true);
  minifier.currentNameGenerator_ = renamer;
  var fragmentResult = minifier.transformNode(fragmentAst);
  assertEquals(expectedFragment,
               glslunit.Generator.getSourceCode(fragmentResult));
}

function testVariableMinifierNoMinifyPublic() {
  var expectedVertex =
    'float someMethod(const int b,float c);' +
    'struct someStruct{' +
    'int field1,field2;' +
    'vec2 field3;' +
    '};' +
    'attribute vec3 attr,anotherAttr;' +
    'void methodOrVariable(){}' +
    'uniform float uGlobal;' +
    'varying vec3 a;' +
    'void main(){' +
    'int b;' +
    'int c;' +
    'vec2 d;' +
    'anotherMethod();' +
    'someMethod(1,4.2);' +
    '}' +
    'float someMethod(const int b,float c){' +
    'vec2 d;' +
    'return attr+methodOrVariable+c+float(b)+12.4;' +
    '}';
  var expectedFragment =
    'mat2 b,c,d,e;' +
    'uniform float uGlobal;' +
    'mat3 f;' +
    'varying vec3 a;' +
    'void main(){}';
  var minifier = new glslunit.compiler.VariableMinifier(false);

  var vertexAst = glslunit.glsl.parser.parse(vertexSource);
  var fragmentAst = glslunit.glsl.parser.parse(fragmentSource);

  var vertexResult = minifier.transformNode(vertexAst);
  assertEquals(expectedVertex,
               glslunit.Generator.getSourceCode(vertexResult));

  var renamer = minifier.currentNameGenerator_;
  minifier = new glslunit.compiler.VariableMinifier(false);
  minifier.currentNameGenerator_ = renamer;
  var fragmentResult = minifier.transformNode(fragmentAst);
  assertEquals(expectedFragment,
               glslunit.Generator.getSourceCode(fragmentResult));
}
