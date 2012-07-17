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
 * @param {!function(new:gf.sim.Entity, !gf.sim.Simulator, !gf.sim.EntityType,
 *     number, number)} entityCtor Entity constructor.
 * @param {!function(new:gf.sim.EntityState, !gf.sim.Entity)} stateCtor Entity
 *     state constructor.
 */
gf.sim.EntityType = function(typeId, entityCtor, stateCtor) {
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

  /**
   * Constructor for the entity state type.
   * @private
   * @type {!function(new:gf.sim.EntityState, !gf.sim.Entity)}
   */
  this.stateCtor_ = stateCtor;
};


/**
 * Creates a new entity of this type.
 * @param {!gf.sim.Simulator} simulator Owning simulator.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 * @return {!gf.sim.Entity} A new entity.
 */
gf.sim.EntityType.prototype.createEntity = function(
    simulator, entityId, entityFlags) {
  return new this.entityCtor_(simulator, this, entityId, entityFlags);
};


/**
 * Allocates a new entity state instance, reusing an existing one if possible.
 * @param {!gf.sim.Entity} entity Entity to allocate the state for.
 * @return {!gf.sim.EntityState} New or recycled entity state.
 */
gf.sim.EntityType.prototype.allocateState = function(entity) {
  // TODO(benvanik): pooling of entity state
  return new this.stateCtor_(entity);
};


/**
 * Releases entity state back to the pool.
 * @param {!gf.sim.EntityState} entityState Entity state that can be released.
 */
gf.sim.EntityType.prototype.releaseState = function(entityState) {
  // TODO(benvanik): pooling of entity state
};
