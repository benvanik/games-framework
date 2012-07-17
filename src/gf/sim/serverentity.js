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

goog.provide('gf.sim.ServerEntity');

goog.require('gf.sim.Entity');



/**
 * Server-side simulation entity base type.
 *
 * @constructor
 * @extends {gf.sim.Entity}
 * @param {!gf.sim.ClientSimulator} simulator Owning server simulator.
 * @param {!gf.sim.EntityType} entityType Entity type.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 */
gf.sim.ServerEntity = function(simulator, entityType, entityId, entityFlags) {
  goog.base(this, simulator, entityType, entityId, entityFlags);

  /**
   * Owning user, if any.
   * An owning user generally has more permission to modify an entity than
   * others. For example, an owning user can issue kill commands on themselves
   * but not on anyone else.
   * @private
   * @type {gf.net.User}
   */
  this.owner_ = null;

  /**
   * Current entity state.
   * This is the authoritative state that is replicated to all observers.
   * It is kept consistent each server tick.
   * @protected
   * @type {!gf.sim.EntityState}
   */
  this.state = entityType.allocateState();
};
goog.inherits(gf.sim.ServerEntity, gf.sim.Entity);


/**
 * @override
 */
gf.sim.ServerEntity.prototype.disposeInternal = function() {
  // Return entity states back to the pool
  this.entityType.releaseState(this.state);

  goog.base(this, 'disposeInternal');
};


/**
 * Gets the server simulator that owns this entity.
 * @return {!gf.sim.ServerSimulator} Simulator.
 */
gf.sim.ServerEntity.prototype.getSimulator = function() {
  return this.simulator;
};


/**
 * Gets the owning user of the entity, if any.
 * @return {gf.net.User} Owning user.
 */
gf.sim.ServerEntity.prototype.getOwner = function() {
  return this.owner_;
};


/**
 * Sets the owning user of the entity, if any.
 * @param {gf.net.User} value New owning user.
 */
gf.sim.ServerEntity.prototype.setOwner = function(value) {
  this.owner_ = value;
};


/**
 * Writes all state to the given writer.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.ServerEntity.prototype.write = function(writer) {
  this.state.write(writer);
};


/**
 * Writes a state delta to the given writer.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.ServerEntity.prototype.writeDelta = function(writer) {
  this.state.writeDelta(writer);
};


/**
 * @override
 */
gf.sim.ServerEntity.prototype.executeCommand = function(command) {
};


/**
 * @override
 */
gf.sim.ServerEntity.prototype.update = function(time, timeDelta) {
};


/**
 * @override
 */
gf.sim.ServerEntity.prototype.postTickUpdate = function(frame) {
};


/**
 * @override
 */
gf.sim.ServerEntity.prototype.resetDirtyState = function() {
  goog.base(this, 'resetDirtyState');

  // When this is called we've already flushed deltas, so reset the bits
  this.state.resetDirtyState();
};
