// Copyright 2011 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.require('glslunit.testing.GlslJstdAdapter');

var testVertexShaderCode =
  'uniform vec4 uTestLocation;' +
  'uniform mat4 uTestMatrix;' +
  'uniform sampler2D uSomeTexture;' +
  'attribute float aMultiplier;' +
  'void main(void) {' +
    'gl_Position = aMultiplier * uTestMatrix * uTestLocation;' +
  '}';

var testFragmentShaderCode =
  'varying vec4 uTestColor;' +
  'uniform mat4 uTestMatrix;' +
  'uniform sampler2D uSomeTexture;' +
  'uniform sampler2D uAnotherTexture;' +
  'void main(void) {' +
    'if (!gl_FrontFacing) {' +
    '  discard;' +
    '}' +
    'gl_FragColor = uTestMatrix * uTestColor * ' +
      '(texture2D(uSomeTexture, vec2(.25, .25)) + ' +
      'texture2D(uAnotherTexture, vec2(.5, .5)));' +
  '}';

fragmentTestSuite('Fragment Shader Test', testFragmentShaderCode, function() {
  testMain('Fragment Test Case', function(gl) {
    // Input Values
    set('uTestColor').asArray([1, 2, 3, 1]);
    set('uTestMatrix').asArray([1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1]);
    set('gl_FrontFacing').asBoolean(true);
    set('uAnotherTexture').asSingleColor([0, 255, 255, 0]);
    set('uSomeTexture').as2DTexture([255, 0, 0, 255,
                                     0 , 255, 0, 255,
                                     0 , 0, 255, 255,
                                     0 , 0, 0, 255]
                                    , 2, 2).
      texParameteri(gl.TEXTURE_MAG_FILTER, gl.NEAREST).
      texParameteri(gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // Expectations
    expect('gl_FragColor')
      .equal([1, 2, 3, 1])
      .withEpsilonOf(0.01);
    expect('texture2D(uSomeTexture, vec2(.25, .25))')
      .equal([1, 0, 0, 1])
      .withEpsilonOf(0.01);
    expect('texture2D(uSomeTexture, vec2(.75, .25))')
      .equal([0, 1, 0, 1])
      .withEpsilonOf(0.01);
    expect('texture2D(uSomeTexture, vec2(.25, .75))')
      .equal([0, 0, 1, 1])
      .withEpsilonOf(0.01);
    expect('texture2D(uSomeTexture, vec2(.75, .75))')
      .equal([0, 0, 0, 1])
      .withEpsilonOf(0.01);
    expect('texture2D(uAnotherTexture, vec2(.5, .5))')
      .equal([0, 1, 1, 0])
      .withEpsilonOf(0.01);
  });
  testMain('Discard Test Case', function() {
    // Input Values
    set('uTestColor').asArray([1, 2, 3, 1]);
    set('uTestMatrix').asArray([1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1]);
    set('gl_FrontFacing').asBoolean(false);
    set('uSomeTexture').asSingleColor([127, 0, 0, 255]);

    // Expectations
    expectDiscard();
  });
});


vertexTestSuite('Vertex Shader Test', testVertexShaderCode, function() {
  testMain('Sample Test Case', function() {
    // Input Values
    set('uTestLocation').asArray([1, 2, 3, 1]);
    set('uTestMatrix').asArray([1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1]);
    set('aMultiplier').asNumber(2);
    set('uSomeTexture').asSingleColor([127, 0, 0, 255]);

    // Expectations
    expect('gl_Position[0]')
      .equal(2)
      .withEpsilonOf(0.01);
  });
});
