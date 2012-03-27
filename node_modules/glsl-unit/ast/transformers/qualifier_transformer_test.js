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
 * @fileoverview Test cases for QualifierTransformer.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.QualifierTransformer');
goog.require('glslunit.glsl.parser');

function testQualiferTransformer() {
  var testSource =
      'attribute vec3 leaveMe;' +
      'uniform mat2 notMeEither;' +
      'varying vec2 changeMe;';
  var expectedSource =
      'attribute vec3 leaveMe;' +
      'uniform mat2 notMeEither;' +
      'uniform vec2 changeMe;';
  var testAst = glslunit.glsl.parser.parse(testSource);
  var transformer = new glslunit.QualifierTransformer('varying', 'uniform');
  var result = transformer.transformNode(testAst);
  assertEquals(expectedSource, glslunit.Generator.getSourceCode(result));
  assertEquals(testSource, glslunit.Generator.getSourceCode(testAst));
}
