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
 * @fileoverview Test cases for NumericInputValue.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.testing.NumericInputValue');
goog.require('glslunit.testing.UntypedValue');
goog.require('goog.array');
goog.require('goog.testing.jsunit');



function testBufferedAs() {
  var testValue = new glslunit.testing.UntypedValue(null, 'someVariable');
  var typedValue = testValue.asArray([1, 2, 3, 4]);
  Int32Array = {};
  typedValue.bufferedAs(Int32Array);
  assertEquals(Int32Array, typedValue.getShaderVariable().bufferType_);
}
