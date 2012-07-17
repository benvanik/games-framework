/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.sim');

goog.require('goog.asserts');


/**
 * Entity ID used to signal no entity.
 * @const
 * @type {number}
 */
gf.sim.NO_ENTITY_ID = 0;


/**
 * GF module ID.
 * Used by {@see gf.sim.createTypeId} to create entity/command type IDs.
 * @const
 * @type {number}
 */
gf.sim.GF_MODULE_ID = 0;


/**
 * Creates an optimized type ID for command and entities.
 * @param {number} module Module index. 0 is reserved for gf.
 * @param {number} type Type index.
 * @return {number} Type ID.
 */
gf.sim.createTypeId = function(module, type) {
  // Special preference for module 0 and 1 to try to fit their types into single
  // byte varints (that means 7 bits). This means only 6 bits for type, but if
  // this becomes too limiting then it can be loosened up.
  goog.asserts.assert(type < 64);
  return (module << 6) | type;
};
