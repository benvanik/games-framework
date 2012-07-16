/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
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

goog.provide('gf.sim.EntityType');



/**
 * Entity type descriptor.
 *
 * @constructor
 * @param {number} typeId Entity type ID.
 * @param {!function(new:gf.sim.Entity)} entityCtor Entity constructor.
 */
gf.sim.EntityType = function(typeId, entityCtor) {
  /**
   * Entity type ID.
   * @type {number}
   */
  this.typeId = typeId;

  /**
   * Constructor for the entity type.
   * @private
   * @type {!function(new:gf.sim.Entity)}
   */
  this.entityCtor_ = entityCtor;
};


/**
 * Creates a new entity of this type.
 * @param {!gf.sim.ClientSimulator} simulator Owning simulator.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 * @return {!gf.sim.ClientEntity} A new entity.
 */
gf.sim.EntityType.prototype.createClientEntity = function(
    simulator, entityId, entityFlags) {
  return new this.entityCtor_(simulator, entityId, entityFlags);
};


/**
 * Creates a new entity of this type.
 * @param {!gf.sim.ServerSimulator} simulator Owning simulator.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 * @return {!gf.sim.ServerEntity} A new entity.
 */
gf.sim.EntityType.prototype.createServerEntity = function(
    simulator, entityId, entityFlags) {
  return new this.entityCtor_(simulator, entityId, entityFlags);
};
