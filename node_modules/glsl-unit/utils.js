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
 * @fileoverview Utility functions for glslunit.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.utils');
goog.require('glslunit.glsl.parser');


/**
 * Takes a type for a GLSL node and returns the appropriate suffix to method
 * calls on this type of node.
 * @param {string} typeName The type name of the node.
 * @return {string} The suffix for method calls on this type.
 */
glslunit.utils.getFunctionSuffix = function(typeName) {
  return glslunit.utils.toTitleOrCamelCase(typeName, true);
};


/**
 * Takes a string that splits words with underscores and reformats it to either
 * camelCase or TitleCase.
 * @param {string} input The input to be reformatted.
 * @param {boolean} initialUpper Whether or not to leave the first letter of the
 *     result capitalized.
 * @return {string} The suffix for method calls on this type.
 */
glslunit.utils.toTitleOrCamelCase = function(input, initialUpper) {
  var result = input.split('_').map(function(x) {
    return x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase();
  }).join('');
  if (!initialUpper) {
    result = result.slice(0, 1).toLowerCase() + result.slice(1);
  }
  return result;
};

/**
 * Array of AST nodes for all readable built in globals.
 * @type {!Array.<!Object>}
 */
glslunit.utils.BUILT_IN_GLOBALS =
  ['varying mediump vec4 gl_FragCoord;',
   'varying bool gl_FrontFacing;',
   'varying mediump vec2 gl_PointCoord;'].map(function(x) {
      return glslunit.glsl.parser.parse(x, 'global_declaration');
   });
