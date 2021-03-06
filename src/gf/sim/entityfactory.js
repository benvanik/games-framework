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

goog.provide('gf.sim.EntityCtor');
goog.provide('gf.sim.EntityFactory');
goog.provide('gf.sim.EntityStateCtor');


/**
 * {@see gf.sim.Entity} constructor.
 * @typedef {function(new:gf.sim.Entity, !gf.sim.Simulator,
 *     !gf.sim.EntityFactory, number, number)}
 */
gf.sim.EntityCtor;


/**
 * {@see gf.sim.EntityState} constructor.
 * @typedef {function(new:gf.sim.EntityState, !gf.sim.Entity)}
 */
gf.sim.EntityStateCtor;



/**
 * Entity type descriptor.
 *
 * @constructor
 * @param {number} typeId Entity type ID.
 * @param {!gf.sim.EntityCtor} entityCtor Entity constructor.
 * @param {!function(new:gf.sim.EntityState, !gf.sim.Entity)} stateCtor Entity
 *     state constructor.
 */
gf.sim.EntityFactory = function(typeId, entityCtor, stateCtor) {
  /**
   * Entity type ID.
   * @type {number}
   */
  this.typeId = typeId;

  /**
   * Constructor for the entity type.
   * @private
   * @type {!gf.sim.EntityCtor}
   */
  this.entityCtor_ = entityCtor;

  /**
   * Constructor for the entity state type.
   * @private
   * @type {!gf.sim.EntityStateCtor}
   */
  this.stateCtor_ = stateCtor;

  /**
   * A pool of unused states.
   * @private
   * @type {!Array.<!gf.sim.EntityState>}
   */
  this.statePool_ = [];
};


/**
 * Creates a new entity of this type.
 * @param {!gf.sim.Simulator} simulator Owning simulator.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 * @return {!gf.sim.Entity} A new entity.
 */
gf.sim.EntityFactory.prototype.createEntity = function(
    simulator, entityId, entityFlags) {
  return new this.entityCtor_(simulator, this, entityId, entityFlags);
};


/**
 * Allocates a new entity state instance, reusing an existing one if possible.
 * @param {!gf.sim.Entity} entity Entity to allocate the state for.
 * @return {!gf.sim.EntityState} New or recycled entity state.
 */
gf.sim.EntityFactory.prototype.allocateState = function(entity) {
  if (this.statePool_.length) {
    var entityState = this.statePool_.pop();
    entityState.reset(entity);
    return entityState;
  }
  return new this.stateCtor_(entity);
};


/**
 * Releases entity state back to the pool.
 * @param {!gf.sim.EntityState} entityState Entity state that can be released.
 */
gf.sim.EntityFactory.prototype.releaseState = function(entityState) {
  // TODO(benvanik): prevent unlimited growth
  this.statePool_.push(entityState);
};
