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
 * @fileoverview Test cases for TestSuite.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('glslunit.testing.TestCase');
goog.require('glslunit.testing.TestSuite');
goog.require('goog.testing.jsunit');



function testTestSuite() {
  var testContext = {};
  var testSource = 'void main(){discard;}';
  var testTestFn = function() {};
  var testResult = true;

  glslunit.testing.TestCase = function(context, height, width, type,
                               sourceAst, description, testFn) {
    assertEquals(testContext, context);
    assertEquals(type, glslunit.testing.TestCase.TestType.FRAGMENT);
    assertEquals(23, height);
    assertEquals(42, width);
    assertEquals(testSource, glslunit.Generator.getSourceCode(sourceAst));
    assertEquals('Some Test Case', description);
    assertEquals(testTestFn, testFn);
  };
  glslunit.testing.TestCase.TestType = {
    FRAGMENT: 100
  };
  glslunit.testing.TestCase.prototype.run = function() {
    return testResult;
  };
  glslunit.testing.TestCase.prototype.getTestPassed = function() {
    return testResult;
  };

  var suite = new glslunit.testing.TestSuite(
      testContext, 23, 42, glslunit.testing.TestCase.TestType.FRAGMENT,
      'Some Sweet Test Suite', testSource,
       function() {
    assertNotUndefined(testMain);
    testMain('Some Test Case', testTestFn);
    testMain('Some Test Case', testTestFn);
  });

  assertEquals('Some Sweet Test Suite', suite.getDescription());
  assertFalse(suite.getSuitePassed());
  assertTrue(suite.run());
  assertTrue(suite.getSuitePassed());
  assertEquals(2, suite.getTestCases().length);

  testResult = false;
  assertFalse(suite.run());
  assertFalse(suite.getSuitePassed());
}
