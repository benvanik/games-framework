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

var heartFragmentShader = [
  '#ifdef GL_ES',
  'precision highp float;',
  '#endif',
  'uniform vec2 resolution;',
  'void main(void)',
  '{',
  '  vec2 p = (2.0*gl_FragCoord.xy-resolution)/resolution.y;',
  '  float a = atan(p.x,p.y)/3.141593;',
  '  float r = length(p);',
  '  // shape',
  '  float h = abs(a);',
  '  float d = (13.0*h - 22.0*h*h + 10.0*h*h*h)/(6.0-5.0*h);',
  '  // color',
  '  float f = step(r,d) > 0. ? pow(1.0-r/d,0.25) : 0.;',
  '  gl_FragColor = vec4(f,0.0,0.0,1.0);',
  '}'
  ].join('\n');

fragmentTestSuite('Heart Fragment Shader', heartFragmentShader, function() {
  testMain('Outside of Heart Test Case', function() {
    // Input Values
    set('resolution').asArray([256, 384]);
    set('gl_FragCoord').asArray([0, 0, 0, 1]);

    // Expectations
    expect('gl_FragColor')
      .equal([0, 0, 0, 1])
      .withEpsilonOf(0.01);
  });
  testMain('Lower Left of Heart Test Case', function() {
    // Input Values
    set('resolution').asArray([256, 384]);
    set('gl_FragCoord').asArray([100, 100, 0, 1]);

    // Expectations
    expect('gl_FragColor')
      .greaterThanEqual([0.75, 0, 0, 1])
      .withEpsilonOf(0.01);

    expect('gl_FragColor')
      .lessThanEqual([0.9, 0, 0, 1])
      .withEpsilonOf(0.01);
  });
});
