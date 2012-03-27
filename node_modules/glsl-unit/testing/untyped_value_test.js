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
 * @fileoverview Test cases for UntypedValues.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.testing.UntypedValue');
goog.require('goog.array');
goog.require('goog.testing.jsunit');


function testAsArray() {
  var testValue = new glslunit.testing.UntypedValue('someVariable');
  var typedValue = testValue.asArray([1, 2, 3, 4]);
  assertEquals('someVariable', testValue.getShaderVariable().name_);
  assertTrue(goog.array.equals(testValue.getShaderVariable().values_,
                               [1, 2, 3, 4]));
}

function testAsIdentityMatrix() {
  var testValue = new glslunit.testing.UntypedValue('someVariable');
  var typedValue = testValue.asIdentityMatrix();
  assertEquals('someVariable', testValue.getShaderVariable().name_);
  assertTrue(goog.array.equals(testValue.getShaderVariable().values_,
                               [1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1]));
}


function testSingleColor() {
  var testValue = new glslunit.testing.UntypedValue('someVariable');
  var typedValue = testValue.asSingleColor([1, 2, 3, 4]);
  assertEquals('someVariable', testValue.getShaderVariable().name_);
  assertTrue(goog.array.equals(testValue.getShaderVariable().data_,
                               [1, 2, 3, 4]));

  var errorMessage = 'Error while creating a Single Color for someVariable: ' +
      'Expected 4 components but found 3 components.';
  assertThrows(errorMessage, function() {
    testValue.asSingleColor([1, 2, 3]);
  });
}


function test2DTexture() {
  var testValue = new glslunit.testing.UntypedValue('someVariable');
  var inputData = [1, 2, 3, 4,
                   5, 6, 7, 8,
                   9, 1, 2, 3];
  var typedValue = testValue.as2DTexture(inputData, 3, 1);
  assertEquals('someVariable', testValue.getShaderVariable().name_);
  assertTrue(goog.array.equals(testValue.getShaderVariable().data_,
                               inputData));
  assertEquals(testValue.getShaderVariable().height_, 3);
  assertEquals(testValue.getShaderVariable().width_, 1);

  var errorMessage = 'Error while creating a Single Color for someVariable: ' +
      'Expected 12 components but found 4 components.';
  assertThrows(errorMessage, function() {
    testValue.as2DTexture([1, 2, 3, 4], 3, 1);
  });
}


function testAsNumber() {
  var testValue = new glslunit.testing.UntypedValue('anotherVariable');
  var typedValue = testValue.asNumber(42);
  assertEquals('anotherVariable', testValue.getShaderVariable().name_);
  assertTrue(goog.array.equals(testValue.getShaderVariable().values_,
                               [42]));
}

function testAsBoolean() {
  var testValue = new glslunit.testing.UntypedValue('someOtherVariable');
  var typedValue = testValue.asBoolean(false);
  assertEquals('someOtherVariable', testValue.getShaderVariable().name_);
  assertTrue(goog.array.equals(testValue.getShaderVariable().values_,
                               [0]));
}
