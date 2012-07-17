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

goog.provide('gf.sim.ClientEntity');

goog.require('gf.sim');
goog.require('gf.sim.Entity');
goog.require('gf.sim.EntityFlag');
goog.require('gf.sim.commands.ReparentCommand');
goog.require('goog.asserts');



/**
 * Client-side simulation entity base type.
 *
 * @constructor
 * @extends {gf.sim.Entity}
 * @param {!gf.sim.ClientSimulator} simulator Owning client simulator.
 * @param {!gf.sim.EntityFactory} entityFactory Entity factory.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag} values.
 */
gf.sim.ClientEntity = function(simulator, entityFactory, entityId,
    entityFlags) {
  goog.base(this, simulator, entityFactory, entityId, entityFlags);

  /**
   * Server state snapshot.
   * Automatically kept in sync with the server, updated each time a new sync
   * packet is received in the simulation update flow.
   * For prediction this is the last confirmed state.
   * @protected
   * @type {!gf.sim.EntityState}
   */
  this.networkState = entityFactory.allocateState(this);

  /**
   * Entity state history.
   * Used for interpolation, this history tracks state from the server at each
   * snapshot. It is used to update the state with the values as interpolated
   * on the server. Only valid if the entity has
   * {@see gf.sim.EntityFlag#INTERPOLATED} set.
   * @protected
   * @type {!Array.<!gf.sim.EntityState>}
   */
  this.previousStates = [];

  /**
   * Client state.
   * Represents the state of the entity on the client, factoring in either
   * interpolation or prediction. If neither feature is enabled then this is
   * identical to {@see #networkState}.
   * @protected
   * @type {!gf.sim.EntityState}
   */
  this.state = (entityFlags & (
      gf.sim.EntityFlag.INTERPOLATED | gf.sim.EntityFlag.PREDICTED)) ?
      entityFactory.allocateState(this) : this.networkState;
};
goog.inherits(gf.sim.ClientEntity, gf.sim.Entity);


/**
 * @override
 */
gf.sim.ClientEntity.prototype.disposeInternal = function() {
  // Release entity states back to the pool
  this.factory.releaseState(this.networkState);
  for (var n = 0; n < this.previousStates.length; n++) {
    this.factory.releaseState(this.previousStates[n]);
  }
  if (this.getFlags() & (
      gf.sim.EntityFlag.INTERPOLATED | gf.sim.EntityFlag.PREDICTED)) {
    this.factory.releaseState(this.state);
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Gets the client simulator that owns this entity.
 * @return {!gf.sim.ClientSimulator} Simulator.
 */
gf.sim.ClientEntity.prototype.getSimulator = function() {
  return /** @type {!gf.sim.ClientSimulator} */ (this.simulator);
};


/**
 * Reads and sets all state from the given reader.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.ClientEntity.prototype.read = function(reader) {
  // Update network state
  this.networkState.read(reader);

  // TODO(benvanik): preserve a state history entry if INTERPOLATED?
};


/**
 * Reads a state delta from the given reader.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.ClientEntity.prototype.readDelta = function(reader) {
  // Update network state
  this.networkState.readDelta(reader);

  // TODO(benvanik): preserve a state history entry if INTERPOLATED?
};


/**
 * Interpolates the entity to the given time.
 * This will only be called if the entity has either its interpolated or
 * predicted bits set. It will be called immediately after network updates
 * and before the scheduler, as well as once per render frame before physics.
 * When an entity is predicted the pending commands will be executed immediately
 * after this function returns.
 * @param {number} time Current time.
 */
gf.sim.ClientEntity.prototype.interpolate = function(time) {
  var flags = this.getFlags();

  // Interpolate all interpolated vars
  if (flags & gf.sim.EntityFlag.INTERPOLATED) {
    this.interpolate_(time);
  }

  // Reset predicted vars to confirmed in preparation for the predicted commands
  if (flags & gf.sim.EntityFlag.PREDICTED) {
    this.networkState.copyPredictedVariables(this.state);
  }
};


/**
 * Performs actual interpolation between historical states.
 * @private
 * @param {number} time Current time.
 */
gf.sim.ClientEntity.prototype.interpolate_ = function(time) {
  goog.asserts.assert(this.getFlags() & gf.sim.EntityFlag.INTERPOLATED);

  // TODO(benvanik): sanity check that all this time stuff is actually required
  this.state.interpolate(this.networkState, this.networkState, 0);

  // // Need at least two states to interpolate
  // if (!this.previousStates.length) {
  //   return;
  // } else if (this.previousStates.length == 1) {
  //   // Only one state - just copy the variables
  //   this.state.interpolate(this.previousStates[0], this.previousStates[0],
  //       0);
  //   this.state.time = time;
  //   return;
  // }

  // // Find the two states that straddle the current time
  // var futureState = null;
  // for (var n = 1; n < this.previousStates.length; n++) {
  //   futureState = this.previousStates[n];
  //   if (futureState.time >= time) {
  //     break;
  //   }
  // }
  // if (!futureState) {
  //   var lastState = this.previousStates[0];
  //   this.state.interpolate(lastState, lastState, 0);
  //   this.state.time = time;
  //   return;
  // }
  // var pastState = this.previousStates[n - 1];

  // // Find interpolation factor t
  // var duration = futureState.time - pastState.time;
  // var baseTime = time - pastState.time;
  // var t = baseTime / (futureState.time - pastState.time);
  // t = goog.math.clamp(t, 0, 1);

  // // Remove past state only if we go over it
  // if (t >= 1) {
  //   this.previousStates.splice(0, n - 1);
  //   this.factory.releaseState(pastState);
  // }

  // // Interpolate between the chosen states
  // this.state.interpolate(pastState, futureState, t);
};


/**
 * @override
 */
gf.sim.ClientEntity.prototype.executeCommand = function(command) {
  if (command instanceof gf.sim.commands.ReparentCommand) {
    if (command.parentId == gf.sim.NO_ENTITY_ID) {
      this.setParent(null);
    } else {
      var parentEntity = this.simulator.getEntity(command.parentId);
      goog.asserts.assert(parentEntity);
      this.setParent(parentEntity);
    }
  }
};


/**
 * @override
 */
gf.sim.ClientEntity.prototype.update = function(time, timeDelta) {
};


/**
 * @override
 */
gf.sim.ClientEntity.prototype.postTickUpdate = function(frame) {
};
