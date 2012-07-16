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

goog.provide('gf.sim.Entity');
goog.provide('gf.sim.EntityDirtyFlag');
goog.provide('gf.sim.EntityFlag');
goog.provide('gf.sim.EntityType');

goog.require('gf.sim');
goog.require('gf.sim.EntityDirtyFlag');
goog.require('goog.Disposable');
goog.require('goog.asserts');



/**
 * Entity base type.
 * Entities are the base unit of simulation logic. They contain custom state
 * that can be updated on server ticks and optionally replicated to clients.
 *
 * Server entities are considered the authoritative copy and always replicate
 * state to client entities; clients wishing to modify entities must use
 * commands. This ensures validation can be performed and that state is tracked
 * in time along with possible client time-shifting (latency compensation/etc).
 *
 * Client entities are replicates of server-authoritative entities and although
 * they can set state (such as through prediction code) none will be
 * automatically sent to the server. Client entities must instead use commands
 * to signal to server logic what they want to happen.
 *
 * For example if the desired behavior is to turn a SphereEntity red when
 * the mouse is clicked one would have the entity handle the mouse behavior and
 * queue a ChangeColorCommand(red). The command will be run through the
 * client-side prediction code and update the local entity color to its new
 * values, as well as being sent to the server. The server will receive the
 * command and change the color, replicating the new value to all other clients.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.sim.Simulator} simulator Owning simulator.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 */
gf.sim.Entity = function(simulator, entityId, entityFlags) {
  goog.base(this);

  goog.asserts.assert(entityId != gf.sim.NO_ENTITY_ID);

  /**
   * Owning simulator.
   * @protected
   * @type {!gf.sim.Simulator}
   */
  this.simulator = simulator;

  /**
   * Session-unique entity ID.
   * The LSB of the entity ID denotes whether it is replicated (0) or
   * client-only (1), ensuring no mixups with client-side IDs.
   * @private
   * @type {number}
   */
  this.entityId_ = entityId;

  /**
   * A bitmask of {@see gf.sim.EntityFlag} indicating the behavior and
   * replication properties of the entity.
   * @private
   * @type {number}
   */
  this.entityFlags_ = entityFlags;

  /**
   * Owning user, if any.
   * @private
   * @type {gf.net.User}
   */
  this.owner_ = null;

  /**
   * A bitmask of {@see gf.sim.EntityDirtyFlag} indicating the dirty state
   * of the entity.
   * This value is tracked per tick and will be reset.
   * @type {number}
   */
  this.dirtyFlags = 0;
};
goog.inherits(gf.sim.Entity, goog.Disposable);


/**
 * Gets the session-unique entity ID.
 * @return {number} Entity ID.
 */
gf.sim.Entity.prototype.getId = function() {
  return this.entityId_;
};


/**
 * Gets a bitmask of entity flags.
 * Flags are defined when the entity is created and cannot be changed.
 * @return {number} A bitmask of {@see gf.sim.EntityFlag} values.
 */
gf.sim.Entity.prototype.getFlags = function() {
  return this.entityFlags_;
};


// gf.sim.Entity.prototype.getOwner = function() {
//   return this.owner_;
// };


// gf.sim.Entity.prototype.setOwner = function(value) {
//   if (this.owner_ == value) {
//     return;
//   }
//   this.owner_ = value;
//   // TODO(benvanik): track value change
//   this.invalidate();
// };


/**
 * Executes a single entity-specific command.
 *
 * On the server this is called once per command as it arrives over the network.
 *
 * On the client this may be called multiple times for predicted commands
 * (those that derive from {@see gf.sim.PredictedCommand}. The first call will
 * have the {@see gf.sim.PredictedCommand#hasPredicted} flag set false and all
 * subsequent calls will have it set to true.
 *
 * @param {!gf.sim.Command} command Command to execute.
 */
gf.sim.Entity.prototype.executeCommand = goog.nullFunction;


/**
 * Handles scheduled entity updates events.
 * @protected
 * @param {number} time Current time.
 * @param {number} timeDelta Time elapsed since the event was scheduled.
 */
gf.sim.Entity.prototype.update = goog.abstractMethod;


/**
 * Schedules a standard update in the future by the given time delta.
 * @protected
 * @param {number} targetTime Target time to execute the update.
 */
gf.sim.Entity.prototype.scheduleUpdate = function(priority, targetTime) {
  this.simulator_.getScheduler().scheduleEvent(
      priority,
      targetTime,
      this.update, this);
};


/**
 * Handles post-update logic.
 * This is called only once per tick and only if the entity was updated on
 * that tick.
 *
 * On the server this is called immediately before the entity is replicated and
 * is the last chance to change data.
 * On the client this is called immediately before rendering.
 *
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.Entity.prototype.postTickUpdate = goog.nullFunction;


/**
 * Invalidates the entity with the simulator, scheduling replication.
 * This method should only be called when the entity has actually changed, as
 * replication does not check for no-op changes and will always generate network
 * traffic.
 * @protected
 */
gf.sim.Entity.prototype.invalidate = function() {
  // As an optimization, only make the call if we really need to
  var wasDirty = !!this.dirtyFlags;
  this.dirtyFlags |= gf.sim.EntityDirtyFlag.UPDATED;
  if (!wasDirty) {
    this.simulator_.invalidateEntity(this);
  }
};


/**
 * Resets the dirty state of the entity after a tick as run.
 * Once this has been called the entity is in a clean state until dirtied again.
 */
gf.sim.Entity.prototype.resetDirtyState = function() {
  this.dirtyFlags = 0;
};



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


/**
 * Entity state flags.
 * Used as a bitmask to define entity state information, such as whether the
 * entity is transient or latency compensated.
 * This flags may be sourced from the static entity type, or overridden at
 * runtime.
 * @enum {number}
 */
gf.sim.EntityFlag = {
  /**
   * Entity exists only the server and should not be replicated to clients.
   * Examples: AI nodes, game rule triggers.
   */
  SERVER_ONLY: 1 << 0,

  /**
   * Entity is transient and will not persist on the server.
   * Entities created with this will be replicated to clients and then
   * detached on the server.
   * Examples: sound effects, particle effects.
   */
  TRANSIENT: 1 << 1,

  /**
   * Entity updates frequently (every tick).
   * Signals that the entity will likely update every tick, enabling some
   * optimizations.
   * Examples: player controlled entities, projectiles.
   */
  FREQUENT_UPDATES: 1 << 2,

  /**
   * Entity participates in the latency compensation system.
   * An entity with this bit will have past state recorded to enable the
   * history system to rewind time. It is expensive to have an entity
   * latency compensated, so only use for appropraite types.
   * Examples: player controlled entities, projectiles.
   */
  LATENCY_COMPENSATED: 1 << 3
};


/**
 * Entity dirty state flags.
 * Used to track major entity changes and whether they need to be sent to
 * observers.
 * @enum {number}
 */
gf.sim.EntityDirtyFlag = {
  /**
   * Entity was created.
   * A full entity state snapshot must be sent.
   */
  CREATED: 1 << 0,

  /**
   * Entity was updated.
   * If the only dirty flag is UPDATED, only a delta needs to be sent.
   */
  UPDATED: 1 << 1,

  /**
   * Entity was deleted.
   * No entity information should be sent if an entity is DELETED.
   */
  DELETED: 1 << 2,

  /**
   * Entity was both created and deleted.
   * Any entity with this flag set should not be replicated.
   */
  CREATED_AND_DELETED: (1 << 0) | (1 << 2)
};
