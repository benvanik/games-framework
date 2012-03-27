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
 * @fileoverview Defines ValueBeingTested.  A ValueUnderTest is used to get the
 * AST for the value being tested.  This should be implemented by classes
 * that enable different types of tests, such as testing the result of a
 * function call or testing the value of a global variable.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.testing.ValueBeingTested');



/**
 * Interface for a ValueBeingTested
 * @interface
 */
glslunit.testing.ValueBeingTested = function() {};


/**
 * Returns the AST for the value being tested for with an expectation.
 * @return {!Object} The AST for the value being tested.
 */
glslunit.testing.ValueBeingTested.prototype.getValueAst = function() {};
