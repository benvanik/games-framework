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

goog.require('gf');
goog.require('gf.log');
goog.require('gf.sim');
goog.require('gf.sim.commands.ReparentCommand');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.math');



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
 * @param {!gf.sim.EntityFactory} entityFactory Entity factory.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag} values.
 */
gf.sim.Entity = function(simulator, entityFactory, entityId, entityFlags) {
  goog.base(this);

  goog.asserts.assert(entityId != gf.sim.NO_ENTITY_ID);

  /**
   * Owning simulator.
   * @protected
   * @type {!gf.sim.Simulator}
   */
  this.simulator = simulator;

  /**
   * Entity type factory.
   * @protected
   * @type {!gf.sim.EntityFactory}
   */
  this.factory = entityFactory;

  if (goog.DEBUG) {
    /**
     * Optional name used when debugging.
     * @type {string?}
     */
    this.debugName = null;
  }

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
   * Parent entity.
   * @private
   * @type {gf.sim.Entity}
   */
  this.parent_ = null;

  /**
   * Child entities.
   * Not replicated over the network, but inferred from the parenting
   * relationships.
   * @private
   * @type {!Array.<!gf.sim.Entity>}
   */
  this.children_ = [];

  /**
   * A bitmask of {@see gf.sim.EntityDirtyFlag} indicating the dirty state
   * of the entity.
   * This value is tracked per tick and will be reset.
   * @type {number}
   */
  this.dirtyFlags = 0;

  /**
   * Current entity state.
   * This is the authoritative state that is replicated to all observers.
   * It is kept consistent each server tick. On clients, it is the last received
   * state from the server. For prediction this is the last confirmed state.
   * @private
   * @type {!gf.sim.EntityState}
   */
  this.state_ = entityFactory.allocateState(this);

  if (gf.CLIENT) {
    // Whether we need a seperate client state
    var splitState = entityFlags & (
        gf.sim.EntityFlag.INTERPOLATED | gf.sim.EntityFlag.PREDICTED);

    /**
     * Client interpolated/predicted state.
     * Represents the state of the entity on the client, factoring in either
     * interpolation or prediction. If neither feature is enabled then this is
     * identical to {@see #networkState}.
     * @private
     * @type {gf.sim.EntityState}
     */
    this.clientState_ = splitState ? entityFactory.allocateState(this) : null;
  }

  // TODO(benvanik): also use for lag compensation history rewinding on server
  /**
   * Entity state history.
   * Used for interpolation, this history tracks state from the server at each
   * snapshot. It is used to update the state with the values as interpolated
   * on the server. Only valid if the entity has
   * {@see gf.sim.EntityFlag#INTERPOLATED} set.
   *
   * On the client, this always has at least one state in it representing the
   * last posted network state. This enables new states coming in off the
   * network to be smoothly interpolated with that state as a base.
   * The states all have their time set to the server time at which they were
   * received. Interpolation occurs in order and through time.
   *
   * @private
   * @type {!Array.<!gf.sim.EntityState>}
   */
  this.stateHistory_ = [];
};
goog.inherits(gf.sim.Entity, goog.Disposable);


/**
 * @override
 */
gf.sim.Entity.prototype.disposeInternal = function() {
  // Trigger removal code from parent
  var parent = this.getParent();
  if (parent) {
    parent.removeChild_(this);
  }

  // Return entity states back to the pool
  this.factory.releaseState(this.state_);
  if (gf.CLIENT && this.clientState_) {
    this.factory.releaseState(this.clientState_);
  }
  for (var n = 0; n < this.stateHistory_.length; n++) {
    this.factory.releaseState(this.stateHistory_[n]);
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Dumps information about the entity to the console.
 * Subclasses can override this to write their own information.
 * @param {number} indent Indent level in the tree.
 * @return {string} Padding string.
 */
gf.sim.Entity.prototype.dumpInfo = function(indent) {
  var pad = '';
  for (var n = 0; n < indent; n++) {
    pad += '..';
  }

  gf.log.write(pad +
      (goog.DEBUG ? (this.debugName ? this.debugName : 'Entity') : 'Entity') +
      ' ' + this.getId() + ' / type ' + this.getTypeId() +
      (this.owner_ ? ' / owner ' + this.owner_.sessionId : ''));
  if (this.children_.length) {
    for (var n = 0; n < this.children_.length; n++) {
      var child = this.children_[n];
      child.dumpInfo(indent + 1);
    }
  }
  // TODO(benvanik): state? most can be reflected

  return pad;
};


/**
 * Gets the simulator that owns this entity.
 * @return {!gf.sim.Simulator} Simulator.
 */
gf.sim.Entity.prototype.getSimulator = function() {
  return this.simulator;
};


/**
 * Gets the entity type ID.
 * @return {number} Entity type ID.
 */
gf.sim.Entity.prototype.getTypeId = function() {
  return this.factory.typeId;
};


/**
 * Gets the owning user of the entity, if any.
 * @return {gf.net.User} Owning user.
 */
gf.sim.Entity.prototype.getOwner = function() {
  return this.owner_;
};


/**
 * Sets the owning user of the entity, if any.
 * @param {gf.net.User} value New owning user.
 */
gf.sim.Entity.prototype.setOwner = function(value) {
  this.owner_ = value;
};


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


/**
 * Gets the parent of the entity.
 * @return {gf.sim.Entity} Parent entity, if any.
 */
gf.sim.Entity.prototype.getParent = function() {
  return this.parent_;
};


/**
 * Sets the parent of the entity.
 * @param {gf.sim.Entity} value New parent entity, if any.
 * @param {boolean=} opt_suppressReplication Don't replicate parent changes on
 *     the network.
 */
gf.sim.Entity.prototype.setParent = function(value, opt_suppressReplication) {
  if (this.parent_ != value) {
    var oldParent = this.parent_;
    this.parent_ = value;

    if (gf.SERVER) {
      // Ignore if not replicated
      if (!(this.getFlags() & gf.sim.EntityFlag.NOT_REPLICATED)) {
        // Send reparent command
        var command = this.createCommand(gf.sim.commands.ReparentCommand.ID);
        command.parentId = value ? value.getId() : gf.sim.NO_ENTITY_ID;
        this.simulator.broadcastCommand(command);
      }
    }

    this.parentChanged(oldParent, value);
    if (oldParent) {
      oldParent.removeChild_(this);
    }
    if (value) {
      value.addChild_(this);
    }
  }
};


/**
 * Adds a child to this entity.
 * This is an internal method called by {@see #setParent}.
 * @private
 * @param {!gf.sim.Entity} entity Child to add.
 */
gf.sim.Entity.prototype.addChild_ = function(entity) {
  this.children_.push(entity);
  this.childAdded(entity);
};


/**
 * Removes a child from this entity.
 * This is an internal method called by {@see #setParent}.
 * @private
 * @param {!gf.sim.Entity} entity Child to remove.
 */
gf.sim.Entity.prototype.removeChild_ = function(entity) {
  goog.array.remove(this.children_, entity);
  this.childRemoved(entity);
};


/**
 * Enumerates the list of child entities calling a function for each present.
 * @param {!function(!gf.sim.Entity):undefined} callback Callback function
 *     that is called once per entity.
 * @param {Object=} opt_scope Scope to call the function in.
 */
gf.sim.Entity.prototype.forEachChild = function(callback, opt_scope) {
  for (var n = 0; n < this.children_.length; n++) {
    callback.call(opt_scope || goog.global, this.children_[n]);
  }
};


/**
 * Gets the number of child entities.
 * @return {number} Child entity count.
 */
gf.sim.Entity.prototype.getChildCount = function() {
  return this.children_.length;
};


/**
 * Gets the index of the given child.
 * @param {!gf.sim.Entity} value Child to look up.
 * @return {number} Child index or -1 if not found.
 */
gf.sim.Entity.prototype.getIndexOfChild = function(value) {
  return goog.array.indexOf(this.children_, value);
};


/**
 * Gets the child at the given index.
 * @param {number} index Child index.
 * @return {gf.sim.Entity} Child entity, if found.
 */
gf.sim.Entity.prototype.getChildAtIndex = function(index) {
  return this.children_[index] || null;
};


/**
 * Gets the child with the given entity ID.
 * @param {number} entityId Entity ID.
 * @return {gf.sim.Entity} Child entity, if found.
 */
gf.sim.Entity.prototype.getChild = function(entityId) {
  // This could be sped up if entity trees end up getting flatter.
  for (var n = 0; n < this.children_.length; n++) {
    if (this.children_[n].getId() == entityId) {
      return this.children_[n];
    }
  }
  return null;
};


/**
 * Handles parent entity changes.
 * @protected
 * @param {gf.sim.Entity} oldParent Old parent entity, if any.
 * @param {gf.sim.Entity} newParent New parent entity, if any.
 */
gf.sim.Entity.prototype.parentChanged = goog.nullFunction;


/**
 * Handles a child being added.
 * @protected
 * @param {!gf.sim.Entity} entity New child.
 */
gf.sim.Entity.prototype.childAdded = goog.nullFunction;


/**
 * Handles a child being removed.
 * @protected
 * @param {!gf.sim.Entity} entity Old child.
 */
gf.sim.Entity.prototype.childRemoved = goog.nullFunction;


/**
 * Gets a list of entities that are owned by this entity.
 * This is used when removing or detaching the entity.
 * @protected
 * @return {Array.<!gf.sim.Entity>} A list of entities.
 */
gf.sim.Entity.prototype.getOwnedEntities = function() {
  return null;
};


/**
 * Removes all children from the simulation, recursively.
 * Subclasses can override this to remove retained entities.
 */
gf.sim.Entity.prototype.recursivelyRemoveEntities = function() {
  // Do this in reverse, as the removal will remove them from ourselves
  for (var n = this.children_.length - 1; n >= 0; n--) {
    var child = this.children_[n];
    this.childRemoved(child);
    this.simulator.removeEntity(child);
  }
  goog.asserts.assert(!this.children_.length);

  // Remove custom owned entities
  var entities = this.getOwnedEntities();
  if (entities) {
    for (var n = 0; n < entities.length; n++) {
      this.simulator.removeEntity(entities[n]);
    }
  }
};


/**
 * Detaches all child entities.
 * Subclasses can override this to detach retained entities.
 */
gf.sim.Entity.prototype.detachEntities = function() {
  // Detach children and don't broadcast the changes (as the client will clean
  // itself up when the entity is removed there anyway)
  for (var n = 0; n < this.children_.length; n++) {
    this.children_[n].setParent(null, true);
  }

  // Detach custom owned entities
  var entities = this.getOwnedEntities();
  if (entities) {
    for (var n = 0; n < entities.length; n++) {
      entities[n].setParent(null, true);
    }
  }
};


/**
 * Gets the entities state.
 * On the server this returns the server-authoritative state.
 * On the client this returns the client-interpolated state.
 * @return {!gf.sim.EntityState} Entity state.
 */
gf.sim.Entity.prototype.getState = function() {
  return gf.CLIENT ? (this.clientState_ || this.state_) : this.state_;
};


/**
 * Reads and sets all state from the given reader.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.Entity.prototype.read = function(reader) {
  this.state_.read(reader);
};


/**
 * Reads a state delta from the given reader.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.Entity.prototype.readDelta = function(reader) {
  this.state_.readDelta(reader);
};


/**
 * Writes all state to the given writer.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.Entity.prototype.write = function(writer) {
  this.state_.write(writer);
};


/**
 * Writes a state delta to the given writer.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.Entity.prototype.writeDelta = function(writer) {
  this.state_.writeDelta(writer);
};


/**
 * Snapshots the current entity state.
 * This snapshot can then be used for interpolation or history.
 * Only entities that are interpolated get snapshots.
 * @param {number} time Time the state was updated.
 */
gf.sim.Entity.prototype.snapshotState = function(time) {
  if (this.getFlags() & gf.sim.EntityFlag.INTERPOLATED) {
    // If we only have one other state, reset the current time to prepare for
    // interpolation
    // This will enable a smooth lerp between the previous state and the one
    // that just arrived
    if (this.stateHistory_.length == 1) {
      this.stateHistory_[0].time = time;
    }

    // Allocate a state, copy the current network state into it, and push
    var historyState = this.factory.allocateState(this);
    historyState.time = time;
    this.state_.copyInterpolatedVariables(historyState);
    this.stateHistory_.push(historyState);
  }
};


/**
 * Interpolates the entity to the given time.
 * This will only be called if the entity has either its interpolated or
 * predicted bits set. It will be called immediately after network updates
 * and before the scheduler, as well as once per render frame before physics.
 * When an entity is predicted the pending commands will be executed immediately
 * after this function returns.
 * @this {gf.sim.Entity}
 * @param {number} time Current time.
 */
gf.sim.Entity.prototype.interpolate = gf.CLIENT ? function(time) {
  var flags = this.getFlags();

  // Skip if nothing to do
  if (!this.clientState_) {
    return;
  }

  // Copy uninterpolated variables to stay consistent
  // TODO(benvanik): find a way to avoid this copy - perhaps double read on
  //     the network
  // TODO(benvanik): only those marked dirty on state
  this.state_.copyImmediateVariables(this.clientState_);

  // Interpolate all interpolated vars
  if (flags & gf.sim.EntityFlag.INTERPOLATED) {
    this.interpolate_(time);
  }

  // Reset predicted vars to confirmed in preparation for the predicted commands
  if (flags & gf.sim.EntityFlag.PREDICTED) {
    goog.asserts.assert(this.clientState_);
    this.state_.copyPredictedVariables(this.clientState_);
  }
} : goog.nullFunction;


/**
 * Performs actual interpolation between historical states.
 * @this {gf.sim.Entity}
 * @private
 * @param {number} time Current time.
 */
gf.sim.Entity.prototype.interpolate_ = gf.CLIENT ? function(time) {
  goog.asserts.assert(this.getFlags() & gf.sim.EntityFlag.INTERPOLATED);

  var clientState = this.clientState_;
  goog.asserts.assert(clientState);

  // The logic here is a bit hairy, but the idea is:
  // (time = current time, states[N] = some state in history)
  // - if time < states[0].time:
  //   - wait until time catches up to the first state
  // - find the states straddled by time, past & future
  // - t = interp between past/future
  // - remove all states before the current time
  // - interpolate(past, future, t)

  // I'm 100% positive there are bugs here; some that I suspect:
  // - not handling the first state that comes through right
  // - when going from no states to some states, there's no lerp
  //   - may need to rewind time (-timeDelta?) to lerp with current state

  // Need at least two states to interpolate, and states must be in the
  // current time range
  // In the steady state (no changes) this is the most common case
  if (!this.stateHistory_.length || this.stateHistory_[0].time > time) {
    return;
  }

  // Find the two states that straddle the current time
  var futureState = null;
  for (var n = 1; n < this.stateHistory_.length; n++) {
    futureState = this.stateHistory_[n];
    if (futureState.time >= time) {
      break;
    }
  }
  // No future state found - all states are in the past
  // This is unlikely, unless the client is *way* behind the server
  // (RTT >> interp interval)
  if (n >= this.stateHistory_.length) {
    // Remove all but the last state
    var lastState = this.stateHistory_[this.stateHistory_.length - 1];
    // TODO(benvanik): fast copy
    clientState.interpolate(lastState, lastState, 0);
    for (var m = 0; m < this.stateHistory_.length - 1; m++) {
      this.factory.releaseState(this.stateHistory_[m]);
    }
    this.stateHistory_.splice(0, this.stateHistory_.length - 1);
    return;
  }
  var pastState = this.stateHistory_[n - 1];
  goog.asserts.assert(pastState != futureState);

  // Find interpolation factor t
  var duration = futureState.time - pastState.time;
  var baseTime = time - pastState.time;
  var t = baseTime / (futureState.time - pastState.time);
  t = goog.math.clamp(t, 0, 1);

  // Interpolate between the chosen states
  clientState.interpolate(pastState, futureState, t);

  // Remove old states - only remove the past state if we don't need it (t>=1)
  var removeBefore = t >= 1 ? n : n - 1;
  if (removeBefore > 0) {
    for (var m = 0; m < removeBefore; m++) {
      this.factory.releaseState(this.stateHistory_[m]);
    }
    this.stateHistory_.splice(0, removeBefore);
  }
  goog.asserts.assert(this.stateHistory_.length);
} : goog.nullFunction;


/**
 * Creates a command targetted at this entity.
 * @protected
 * @param {number} typeId Command type ID.
 * @return {!gf.sim.Command} New command.
 */
gf.sim.Entity.prototype.createCommand = function(typeId) {
  var commandFactory = this.simulator.getCommandFactory(typeId);
  goog.asserts.assert(commandFactory);
  var command = commandFactory.allocate();
  command.targetEntityId = this.entityId_;
  return command;
};


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
gf.sim.Entity.prototype.executeCommand = function(command) {
  if (gf.CLIENT) {
    // Reparent the entity
    if (command instanceof gf.sim.commands.ReparentCommand) {
      if (command.parentId == gf.sim.NO_ENTITY_ID) {
        this.setParent(null);
      } else {
        var parentEntity = this.simulator.getEntity(command.parentId);
        goog.asserts.assert(parentEntity);
        this.setParent(parentEntity);
      }
    }
  }
};


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
 * @param {gf.sim.SchedulingPriority} priority Priority of the event.
 * @param {number=} opt_targetTime Target time to execute the update. If omitted
 *     then the update will be processed on the next tick.
 */
gf.sim.Entity.prototype.scheduleUpdate = function(priority, opt_targetTime) {
  if (this.isDisposed()) {
    return;
  }
  this.simulator.getScheduler().scheduleEvent(
      priority,
      opt_targetTime === undefined ? gf.sim.NEXT_TICK : opt_targetTime,
      this.update, this);
};


/**
 * Handles post-network change logic.
 * This is called only once per tick when the entity state receives changes
 * from the network.
 *
 * On the client this is called immediately after network processing and before
 * scheduling.
 */
gf.sim.Entity.prototype.postNetworkUpdate = function() {
  if (gf.CLIENT && this.clientState_) {
    this.state_.copyImmediateVariables(this.clientState_);
  }
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
    this.simulator.invalidateEntity(this);
  }
};


/**
 * Resets the dirty state of the entity after a tick as run.
 * Once this has been called the entity is in a clean state until dirtied again.
 */
gf.sim.Entity.prototype.resetDirtyState = function() {
  this.dirtyFlags = 0;

  // When this is called we've already flushed deltas, so reset the bits
  this.state_.resetDirtyState();
  if (gf.CLIENT && this.clientState_) {
    this.clientState_.resetDirtyState();
  }
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
   * Entity is not replicated and exists only on the host it was created on.
   * Examples: AI nodes (server only), game rule triggers (server only).
   */
  NOT_REPLICATED: 1 << 0,

  /**
   * Entity updates frequently (every tick).
   * Signals that the entity will likely update every tick, enabling some
   * optimizations.
   * Examples: player controlled entities, projectiles.
   */
  UPDATED_FREQUENTLY: 1 << 1,

  /**
   * Entity has variables that are predicted.
   * Predicted entities are significantly more expensive than unpredicted
   * ones and should only be used when the entity is controllable by a player.
   * Examples: local player controlled entities, local projectiles.
   */
  PREDICTED: 1 << 2,

  /**
   * Entity has variables that are interpolated.
   * Interpolated entities have some of their variables interpolated each
   * render frame to approximate the correct state inbetween updates from the
   * server.
   * Examples: remote player controlled entities, remote projectiles.
   */
  INTERPOLATED: 1 << 3,

  /**
   * Entity participates in the latency compensation system.
   * An entity with this bit will have past state recorded to enable the
   * history system to rewind time. It is expensive to have an entity
   * latency compensated, so only use for appropraite types.
   * Examples: player controlled entities, projectiles.
   */
  LATENCY_COMPENSATED: 1 << 4,

  /**
   * Entity is transient and will not persist on the server.
   * Entities created with this will be replicated to clients and then
   * detached on the server.
   * Examples: sound effects, particle effects.
   */
  TRANSIENT: 1 << 5,

  /**
   * Replicate this entity to the owner only.
   * Examples: player entity controllers, cameras.
   */
  OWNER_ONLY: 1 << 6,

  /**
   * Entity is the root entity in the simulation.
   * This must only ever be set on a single entity.
   */
  ROOT: 1 << 7
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
