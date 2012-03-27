// Copyright 2012 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the GLSL Preprocessor.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.Compiler');
goog.require('glslunit.compiler.GlslPreprocessor');
goog.require('glslunit.compiler.Preprocessor');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('goog.testing.jsunit');


function setUp() {
  shaderSource =
    '//! MODE VERTEX_TEXTURES\n' +
    '//! JSCONST SOME_CONST 42.0\n' +
    '#ifdef GL_ES\n' +
    'precision highp float;\n' +
    '#endif\n' +
    '#define BAR 3\n' +
    '#ifndef DEFAULT_MODE\n' +
    'vec2 iconCoord;\n' +
    '#endif\n' +
    '#if BAR==3\n' +
    'const int someConstant;\n' +
    '#endif\n' +
    '#if defined(VERTEX_TEXTURES) && VERTEX_TEXTURES==1 && BAR==3\n' +
    'const int keepMe;\n' +
    '#endif\n' +
    '#define FOO 2.0\n' +
    '#if defined(BAR) - 1\n' +
    '#undef FOO\n' +
    '#else\n' +
    '#define FOO 1.0\n' +
    '#endif\n' +
    'void main() {\n' +
    '  x = SOME_CONST + FOO;\n' +
    '#ifndef BEARS\n' +
    '  y = 3.0;\n' +
    '#  ifdef VERTEX_TEXTURES\n' +
    '  z = 1.0 + FOO;\n' +
    '#    ifdef RAZ\n' +
    '  z = 5.0 + FOO;\n' +
    '#      ifdef VERTEX_TEXTURES\n' +
    '  z = 1.1 + FOO;\n' +
    '#      else\n' +
    '  z = 1.2 + FOO;\n' +
    '#      endif\n' +
    '#    endif\n' +
    '#  else\n' +
    '  z = 2.0 + FOO;\n' +
    '#  endif\n' +
    '#define RAZ FOO\n' +
    '  z = RAZ;\n' +
    '#define FOO FOO\n' +
    '  z = RAZ;\n' +
    '#undef RAZ\n' +
    '  z = RAZ;\n' +
    '#endif\n' +
    '#undef VERTEX_TEXTURES\n' +
    '#ifdef VERTEX_TEXTURES\n' +
    '  z = 1.0 + FOO;\n' +
    '#else\n' +
    '  z = 7.0 + FOO;\n' +
    '#endif\n' +
    '#define X (4 + Y)\n' +
    '#define Y (2 * X)\n' +
    '  z = X;\n' +
    '  z = Y;\n' +
    '#define twice(x) (2*(x))\n' +
    '#define call_with_1(x) x(1)\n' +
    '  z = call_with_1(twice);\n' +
    '#define CHOOSE(cond, ifTrue, ifFalse) mix(ifFalse, ifTrue, ' +
        'float(cond))\n' +
    '  z = CHOOSE(twice, call_with_1(abs), twice(1.0));\n' +
    '}';
}

function testParseDefinitions() {
  var expectedResult =
    'precision highp float;\n' +
    '#ifndef DEFAULT_MODE\n' +
    'vec2 iconCoord;\n' +
    '#endif\n' +
    'const int someConstant;\n' +
    '#if defined(_a)&&_a==1&&3==3\n' +
    'const int keepMe;\n' +
    '#endif\n' +
    'void main(){' +
    'x=_b+1.;' +
    'y=3.;\n' +
    '#ifdef _a\n' +
    'z=1.+1.;\n' +
    '#else\n' +
    'z=2.+1.;\n' +
    '#endif\n' +
    'z=1.;' +
    'z=FOO;' +
    'z=RAZ;' +
    'z=7.+FOO;' +
    'z=4+2*X;' +
    'z=2*(4+Y);' +
    'z=2*1;' +
    'z=mix(2*1.,abs(1),float(twice));' +
    '}';
  var shaderProgram =
      glslunit.compiler.Preprocessor.ParseFile('test', {'test': shaderSource});
  var compiler = new glslunit.compiler.Compiler(shaderProgram);
  compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
      new glslunit.compiler.GlslPreprocessor(
          ['DEFAULT_MODE'], ['GL_ES'], true, true));
  shaderProgram = compiler.compileProgram();
  assertEquals(expectedResult,
               glslunit.Generator.getSourceCode(shaderProgram.vertexAst));
}


function testElif() {
  var shaderSource =
    '//! MODE VERTEX_TEXTURES\n' +
    '#if 1\n' +
    '  const int z = keptIfBranch;\n' +
    '  #define FOO_BAR_RAZ\n' +
    '#elif VERTEX_TEXTURES\n' +
    '  const int z = keptMode;\n' +
    '#else\n' +
    '  const int z = keptElse;\n' +
    '#endif\n' +
    '//! MODE VERTEX_TEXTURES\n' +
    '#if 0\n' +
    '  const int z = keptIfBranch;\n' +
    '#elif defined(VERTEX_TEXTURES)\n' +
    '  const int z = keptMode;\n' +
    '#elif VERTEX_TEXTURES==42 && defined(FOO_BAR_RAZ)\n' +
    '  const int z = keptModeElif;\n' +
    '#elif defined (BAR)\n' +
    '  const int z = keptFalseElif;\n' +
    '#elif !defined(FOO)\n' +
    '  const int z = keptElif;\n' +
    '#elif 1\n' +
    '  const int z = keptSecondElif;\n' +
    '  #if 1\n' +
    '    const int z = shouldBeIgnored;\n' +
    '  #elif VERTEX_TEXTURES\n' +
    '    const int z = keepIgnoring;\n' +
    '  #else\n' +
    '    const int z = didYouIgnoreMe;\n' +
    '  #endif\n' +
    '#else\n' +
    '  const int z = keptElse;\n' +
    '#endif\n' +
    '';

  var expectedResult =
    'const int z=keptIfBranch;\n' +
    '#if defined(VERTEX_TEXTURES)\n' +
    'const int z=keptMode;\n' +
    '#elif VERTEX_TEXTURES==42&&1\n' +
    'const int z=keptModeElif;\n' +
    '#else\n' +
    'const int z=keptElif;\n' +
    '#endif\n' +
    '';
  var shaderProgram =
      glslunit.compiler.Preprocessor.ParseFile('test', {'test': shaderSource});
  var resultAst = glslunit.compiler.GlslPreprocessor.preprocessAst(
      shaderProgram.vertexAst, shaderProgram.shaderModes, 'vertex_start');
  assertEquals(expectedResult, glslunit.Generator.getSourceCode(resultAst));
}
