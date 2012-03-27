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
 * @fileoverview Utility functions for use with glsl compiler.
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.compiler.Utils');

goog.require('glslunit.NodeCollector');



/**
 * Constructor for Utility functions.  Should never be constructed.
 * @constructor
 */
glslunit.compiler.Utils = function() {};


/**
 * Creates a set of the IDs for all declarator nodes underneath struct
 * definitions.
 * @param {!Object} node The node to gather struct declarations for.  Should be
 *     a root node.
 * @return {Array.<boolean>} The set of IDs for nodes that are declarators
 *     underneath struct definitions.
 */
glslunit.compiler.Utils.getStructDeclarations = function(node) {
  var structNodes = glslunit.NodeCollector.collectNodes(node,
      function(x, stack) {
    return (x.type == 'declarator' &&
            stack.slice(-1)[0].type == 'struct_definition');
  });
  var result = [];
  goog.array.forEach(structNodes, function(structDeclarator) {
    result[structDeclarator.id] = true;
  });
  return result;
};
