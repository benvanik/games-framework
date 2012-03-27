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

/**
 * @fileoverview Testcases for the ReplaceAttributeTransformer.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.ReplaceAttributeTransformer');

function testReplaceAttribute() {
  var testSource =
    'attribute vec3 foo, bar, raz;' +
    'void main() {' +
    '  gl_Position = vec4(foo.x, bar);' +
    '}';
  var expectedSource =
    'attribute vec3 foo,raz;' +
    'void main(){' +
    'gl_Position=vec4(foo.x,vec3(1.,2.,3.));' +
    '}';
  var actualSource = glslunit.ReplaceAttributeTransformer.replaceAttributes(
    testSource, {bar: [1, 2, 3]});
  assertEquals(expectedSource,
               actualSource);
}

function testReplaceAttributeRemoveDeclaration() {
  var testSource =
    'attribute vec3 bar;' +
    'void main() {' +
    '  gl_Position = vec4(1., bar);' +
    '}';
  var expectedSource =
    'void main(){' +
    'gl_Position=vec4(1.,vec3(1.,2.,3.));' +
    '}';
  var actualSource = glslunit.ReplaceAttributeTransformer.replaceAttributes(
    testSource, {bar: [1, 2, 3]});
  assertEquals(expectedSource,
               actualSource);
}

function testReplaceAttributeRedeclareParameter() {
  var testSource =
    'attribute vec3 bar;' +
    'void main(vec3 bar) {' +
    '  gl_Position = vec4(1., bar);' +
    '}';
  var expectedSource =
    'void main(vec3 bar){' +
    'gl_Position=vec4(1.,bar);' +
    '}';
  var actualSource = glslunit.ReplaceAttributeTransformer.replaceAttributes(
    testSource, {bar: [1, 2, 3]});
  assertEquals(expectedSource,
               actualSource);
}

function testReplaceAttributeRedeclareLocal() {
  var testSource =
    'attribute float bar, raz, meh;' +
    'void main() {' +
    '  float foo = bar;' +
    '  vec2 bar;' +
    '  gl_Position = vec4(1., 1., bar);' +
    '}';
  var expectedSource =
    'attribute float raz,meh;' +
    'void main(){' +
    'float foo=42.;' +
    'vec2 bar;' +
    'gl_Position=vec4(1.,1.,bar);' +
    '}';
  var actualSource = glslunit.ReplaceAttributeTransformer.replaceAttributes(
    testSource, {bar: [42]});
  assertEquals(expectedSource,
               actualSource);
}
