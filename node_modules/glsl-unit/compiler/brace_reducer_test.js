// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the ConstructorMinifier.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.compiler.BraceReducer');
goog.require('glslunit.glsl.parser');
goog.require('goog.testing.jsunit');



function setUp() {
  inputSource =
      'void main(){' +
      'for(int i=0;i<10;++i)' +
      'foo+=foo;' +
      'for(int i=0;i<10;++i){' +
      'bar+=foo;' +
      '}' +
      'for(int i=0;i<10;++i){' +
      'bar+=foo;' +
      'return;' +
      '}' +
      'if(false){' +
      'i++;j++;}else{' +
      'return;' +
      '}' +
      'do {k++;}while(false)' +
      '}';
}


function testConstructorMinifier() {
  var expectedSource =
      'void main(){' +
      'for(int i=0;i<10;++i)' +
      'foo+=foo;' +
      'for(int i=0;i<10;++i)' +
      'bar+=foo;' +
      'for(int i=0;i<10;++i){' +
      'bar+=foo;' +
      'return;' +
      '}' +
      'if(false){' +
      'i++;j++;}else ' +
      'return;' +
      'do k++;while(false)' +
      '}';
  var minifier = new glslunit.compiler.BraceReducer();
  var inputNode = glslunit.glsl.parser.parse(inputSource);
  var newNode = minifier.transformNode(inputNode);
  assertNotEquals(inputNode, newNode);
  assertEquals(expectedSource, glslunit.Generator.getSourceCode(newNode));
}
