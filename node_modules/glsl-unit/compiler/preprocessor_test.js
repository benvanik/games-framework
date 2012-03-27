// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the Preprocessor.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.Preprocessor');
goog.require('goog.testing.jsunit');



function setUp() {
  shaderInput =
    '//! NAMESPACE=glslunit.test\n' +
    '//! CLASS=TestShader\n' +
    '//! SUPERCLASS=TestSuper\n' +
    '//! MODE SOME_MODE Zero:0,One:1,Two:2\n' +
    '//! INCLUDE shaderinclude.glsl\n' +
    '//! JSREQUIRE raz\n' +
    '//! JSCONST VAL2 raz.FOOBAR\n' +
    'uniform float commonVar;\n' +
    '//! FRAGMENT\n' +
    'varying vec2 FRAG_VAR;\n' +
    '//! COMMON\n' +
    'void CommonFunc(){}\n' +
    '//! VERTEX\n' +
    'void vertexMain(){}\n' +
    'float lastVar;\n' +
    '//! OVERRIDE vertexMain baseVertexMain\n' +
    '//! FRAGMENT\n' +
    '//! OVERRIDE CommonFunc baseCommonFunc\n';

  shaderInclude =
    '//! VERTEX\n' +
    '//! MODE INCLUDE_DEFAULT\n' +
    '//! JSREQUIRE foo.bar\n' +
    '//! JSCONST VAL1 1 * 55 / 2.\n' +
    'attribute vec2 vertexIncludeVar;\n';
}



function testPreprocessor() {
  var originalVertex =
    '//! NAMESPACE=glslunit.test\n' +
    '//! CLASS=TestShader\n' +
    '//! SUPERCLASS=TestSuper\n' +
    '//! MODE SOME_MODE Zero:0,One:1,Two:2\n' +
    '//! INCLUDE shaderinclude.glsl\n' +
    '//! VERTEX\n' +
    '//! MODE INCLUDE_DEFAULT\n' +
    '//! JSREQUIRE foo.bar\n' +
    '//! JSCONST VAL1 1 * 55 / 2.\n' +
    'attribute vec2 vertexIncludeVar;\n\n' +
    '//! JSREQUIRE raz\n' +
    '//! JSCONST VAL2 raz.FOOBAR\n' +
    'uniform float commonVar;\n' +
    '//! COMMON\n' +
    'void CommonFunc(){}\n' +
    '//! VERTEX\n' +
    'void vertexMain();void baseVertexMain(){}\n' +
    'float lastVar;\n' +
    '//! OVERRIDE vertexMain baseVertexMain\n';

  var originalFragment =
    '//! NAMESPACE=glslunit.test\n' +
    '//! CLASS=TestShader\n' +
    '//! SUPERCLASS=TestSuper\n' +
    '//! MODE SOME_MODE Zero:0,One:1,Two:2\n' +
    '//! INCLUDE shaderinclude.glsl\n' +
    '//! JSREQUIRE raz\n' +
    '//! JSCONST VAL2 raz.FOOBAR\n' +
    'uniform float commonVar;\n' +
    '//! FRAGMENT\n' +
    'varying vec2 FRAG_VAR;\n' +
    '//! COMMON\n' +
    'void CommonFunc();void baseCommonFunc(){}\n' +
    '//! FRAGMENT\n' +
    '//! OVERRIDE CommonFunc baseCommonFunc\n\n';

  var libraries = {
    'main.glsl': shaderInput,
    'shaderinclude.glsl': shaderInclude
  };
  var result = glslunit.compiler.Preprocessor.ParseFile('main.glsl', libraries);
  assertEquals('glslunit.test', result.namespace);
  assertEquals('TestShader', result.className);
  assertEquals('TestSuper', result.superClass);
  assertEquals(originalVertex, result.originalVertexSource);
  assertEquals(originalFragment, result.originalFragmentSource);
  var expectedFragmentSource =
    'uniform float commonVar;' +
    'varying vec2 FRAG_VAR;' +
    'void CommonFunc();void baseCommonFunc(){}';
  assertEquals(expectedFragmentSource,
               glslunit.Generator.getSourceCode(result.fragmentAst));
  var expectedVertexSource =
    'attribute vec2 vertexIncludeVar;' +
    'uniform float commonVar;' +
    'void CommonFunc(){}' +
    'void vertexMain();void baseVertexMain(){}' +
    'float lastVar;';
  assertEquals(expectedVertexSource,
               glslunit.Generator.getSourceCode(result.vertexAst));

  assertEquals(2, result.shaderModes.length);
  assertEquals('SOME_MODE', result.shaderModes[0].preprocessorName);
  assertEquals('Zero', result.shaderModes[0].options[0].name);
  assertEquals(0, result.shaderModes[0].options[0].value);
  assertEquals('One', result.shaderModes[0].options[1].name);
  assertEquals(1, result.shaderModes[0].options[1].value);
  assertEquals('Two', result.shaderModes[0].options[2].name);
  assertEquals(2, result.shaderModes[0].options[2].value);
  assertEquals('INCLUDE_DEFAULT', result.shaderModes[1].preprocessorName);
  assertEquals('OFF', result.shaderModes[1].options[0].name);
  assertEquals(0, result.shaderModes[1].options[0].value);
  assertEquals('ON', result.shaderModes[1].options[1].name);
  assertEquals(1, result.shaderModes[1].options[1].value);

  assertEquals(2, result.jsRequires.length);
  assertEquals('foo.bar', result.jsRequires[0]);
  assertEquals('raz', result.jsRequires[1]);

  assertEquals(2, result.jsConsts.length);
  assertEquals('VAL1', result.jsConsts[0].value);
  assertEquals('1 * 55 / 2.', result.jsConsts[0].expression);
  assertEquals('VAL2', result.jsConsts[1].value);
  assertEquals('raz.FOOBAR', result.jsConsts[1].expression);
}


function testException() {
  var libraries = {
    'main.glsl': shaderInput,
    'shaderinclude.glsl': shaderInclude + 'SOME_UNPARSABLE_GUNK NOPARSE ME\n'
  };
  var expectedError = 'Error while parsing the vertex shader code\n' +
      '\tshaderinclude.glsl 6:21 Expected type name but " " found.\n' +
      '\tSOME_UNPARSABLE_GUNK NOPARSE ME';
  assertThrows(expectedError,
               function() {
                 glslunit.compiler.Preprocessor.ParseFile('main.glsl',
                                                          libraries);
               });
}

