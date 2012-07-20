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

goog.provide('gf.sim.ClientSimulator');

goog.require('gf.log');
goog.require('gf.net.PacketWriter');
goog.require('gf.sim.EntityFlag');
goog.require('gf.sim.Simulator');
goog.require('gf.sim.packets.ExecCommands');
goog.require('gf.sim.packets.SyncSimulation');
goog.require('gf.sim.util.CommandList');
goog.require('gf.sim.util.PredictedCommandList');
goog.require('goog.array');



/**
 * Client simulation component.
 * Runs the client-side entity simulation, handling commands and updating
 * entities.
 *
 * @constructor
 * @extends {gf.sim.Simulator}
 * @param {!gf.Runtime} runtime Runtime instance.
 * @param {!gf.net.ClientSession} session Network session.
 */
gf.sim.ClientSimulator = function(runtime, session) {
  goog.base(this, runtime, 1);

  /**
   * Network session.
   * @private
   * @type {!gf.net.ClientSession}
   */
  this.session_ = session;
  session.packetSwitch.register(
      gf.sim.packets.SyncSimulation.ID,
      this.handleSyncSimulation_, this);

  // TODO(benvanik): slotted list
  /**
   * A list of entities needing prediction/interpolation.
   * @private
   * @type {!Array.<!gf.sim.Entity>}
   */
  this.interpolatedEntities_ = [];

  /**
   * List of incoming commands from the network.
   * Commands will be processed on the next update.
   * @private
   * @type {!gf.sim.util.CommandList}
   */
  this.incomingCommandList_ = new gf.sim.util.CommandList();

  /**
   * List of outgoing commands to the network.
   * Contains logic for predicted commands; both those sent to the server and
   * unconfirmed
   * ({@see gf.sim.util.PredictedCommandList#getUnconfirmedPredictedArray}) and
   * those waiting to be sent
   * ({@see gf.sim.util.PredictedCommandList#getOutgoingPredictedArray}).
   * @private
   * @type {!gf.sim.util.PredictedCommandList}
   */
  this.outgoingCommandList_ = new gf.sim.util.PredictedCommandList();

  /**
   * Last time commands were sent to the server.
   * @private
   * @type {number}
   */
  this.lastSendTime_ = 0;
};
goog.inherits(gf.sim.ClientSimulator, gf.sim.Simulator);


/**
 * @override
 */
gf.sim.ClientSimulator.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};


/**
 * @override
 */
gf.sim.ClientSimulator.prototype.addEntity = function(entity) {
  goog.base(this, 'addEntity', entity);

  // Track predicted entities
  if (entity.getFlags() & (
      gf.sim.EntityFlag.PREDICTED | gf.sim.EntityFlag.INTERPOLATED)) {
    this.interpolatedEntities_.push(entity);
  }
};


/**
 * @override
 */
gf.sim.ClientSimulator.prototype.removeEntity = function(entity) {
  goog.base(this, 'removeEntity', entity);

  // Un-track predicted entities
  // TODO(benvanik): faster removal via slotted list
  if (entity.getFlags() & (
      gf.sim.EntityFlag.PREDICTED | gf.sim.EntityFlag.INTERPOLATED)) {
    goog.array.remove(this.interpolatedEntities_, entity);
  }
};


/**
 * Number of input updates sent per second.
 * The more updates the higher potential for conjestion, but the smoother the
 * updates for other players.
 * @private
 * @const
 * @type {number}
 */
gf.sim.ClientSimulator.CLIENT_UPDATE_RATE_ = 20;


/**
 * @override
 */
gf.sim.ClientSimulator.prototype.update = function(frame) {
  // NOTE: updates to entity state (create/update/delete) have been done already
  //       in the netservice

  // Prepare entity states for update with interpolation/prediction
  this.interpolateEntities(frame.time);

  // Process incoming commands
  this.executeCommands(
      this.incomingCommandList_.getArray(),
      this.incomingCommandList_.getCount());
  this.incomingCommandList_.releaseAllCommands();

  // Run scheduled events
  this.getScheduler().update(frame);

  // Perform post-update work on entities that were marked as dirty
  this.postTickUpdateEntities(frame);

  // Flush any pending commands generated during this update
  this.sendPendingCommands_(frame);

  // Post update
  this.postUpdate(frame);

  // Compact, if needed - this prevents memory leaks from caches
  this.compact_(frame);
};


/**
 * Prepares all entities for rendering.
 * This must be called each render frame to handle interpolation and client-side
 * prediction before running local physics/etc.
 *
 * It works by interpolating variables on entities that need it and running
 * client-side prediction code by executing all commands that have been
 * unconfirmed or unsent to the server. When this function returns the entity
 * state will be the predicted state.
 *
 * This function is also called automatically once per update tick to ensure all
 * entity logic runs with the latest state.
 *
 * @param {number} time Current time.
 */
gf.sim.ClientSimulator.prototype.interpolateEntities = function(time) {
  // Interpolate all entities (and prepare predicted entities)
  for (var n = 0; n < this.interpolatedEntities_.length; n++) {
    var entity = this.interpolatedEntities_[n];
    entity.interpolate(time);
  }

  // Execute prediction commands
  this.outgoingCommandList_.executePrediction(this);
};


/**
 * @override
 */
gf.sim.ClientSimulator.prototype.executeCommand = function(command) {
  // TODO(benvanik): global commands
};


/**
 * Queues a command for transmission to the server.
 * If the command is a {@see gf.sim.PredictedCommand} then it is retained for
 * re-execution during prediction.
 * @param {!gf.sim.Command} command Command to transmit.
 */
gf.sim.ClientSimulator.prototype.sendCommand = function(command) {
  this.outgoingCommandList_.addCommand(command);
};


/**
 * Sends any pending commands generated during the current update.
 * @private
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.ClientSimulator.prototype.sendPendingCommands_ = function(frame) {
  if (!this.outgoingCommandList_.hasOutgoing()) {
    return;
  }

  var delta = frame.time - this.lastSendTime_;
  if (delta >= gf.sim.ClientSimulator.CLIENT_UPDATE_RATE_) {
    this.lastSendTime_ = frame.time;

    // Build command packet
    // Add header
    var writer = gf.net.PacketWriter.getSharedWriter();
    gf.sim.packets.ExecCommands.write(
        writer, gf.sim.packets.ExecCommands.writeInstance);

    // Write commands
    this.outgoingCommandList_.write(writer);

    // Send
    this.session_.send(writer.finish());
  }
};


/**
 * Compaction interval, in seconds.
 * Doesn't need to be too frequent, but some caches grow without bound and
 * this must be called to prevent leaks.
 * @private
 * @const
 * @type {number}
 */
gf.sim.ClientSimulator.COMPACT_INTERVAL_ = 15;


/**
 * Cleans up cached data that is no longer relevant.
 * @private
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.ClientSimulator.prototype.compact_ = function(frame) {
  if (frame.time - this.lastCompactTime_ <
      gf.sim.ClientSimulator.COMPACT_INTERVAL_) {
    return;
  }
  this.lastCompactTime_ = frame.time;

  // TODO(benvanik): stage this out over multiple ticks to prevent spikes
  // TODO(benvanik): compact dirty entities list?

  // Compact command lists
  this.incomingCommandList_.compact();
  this.outgoingCommandList_.compact();
};


/**
 * Handles simulation sync packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.sim.ClientSimulator.prototype.handleSyncSimulation_ =
    function(packet, packetType, reader) {
  // Read header
  var confirmedSequence = reader.readVarInt();
  var createEntityCount = reader.readVarInt();
  var updateEntityCount = reader.readVarInt();
  var deleteEntityCount = reader.readVarInt();
  var commandCount = reader.readVarInt();

  // Confirm prediction sequence number
  // This performs the slicing of the stashed command list to be only those
  // sent or unsent and not yet confirmed
  this.outgoingCommandList_.confirmSequence(confirmedSequence);

  // TODO(benvanik): cached parenting list
  var parentingRequired = null;

  // Create entities
  for (var n = 0; n < createEntityCount; n++) {
    // Read entity ID, uncompress into full ID
    var entityId = reader.readVarInt() << 1;

    // Read entity info
    var entityTypeId = reader.readVarInt();
    var entityFlags = reader.readVarInt();
    var entityParentId = reader.readVarInt();

    // Get entity type factory
    var entityFactory = this.getEntityFactory(entityTypeId);
    if (!entityFactory) {
      // Invalid entity type
      gf.log.debug('Invalid entity type ' + entityTypeId + ' from server');
      return false;
    }

    // Create entity
    var entity = entityFactory.createEntity(
        this, entityId, entityFlags);

    // Load initial values
    entity.read(reader);

    // Add to simulation
    this.addEntity(entity);

    // Queue for parenting
    // We have to do this after the adds as we are not sorted and the parent
    // may be the next entity in the packet
    if (entityParentId) {
      if (!parentingRequired) {
        parentingRequired = [];
      }
      parentingRequired.push([entity, entityParentId]);
    } else {
      // Notify now
      entity.postNetworkUpdate();
    }

    gf.log.write('<- create entity', entityId);
  }

  // Update entities
  for (var n = 0; n < updateEntityCount; n++) {
    // Read entity ID, uncompress into full ID
    var entityId = reader.readVarInt() << 1;

    // Find entity
    var entity = this.getEntity(entityId);
    if (!entity) {
      // Entity not found
      gf.log.debug('Target entity of server update not found ' + entityId);
      return false;
    }

    // Load delta values
    entity.readDelta(reader);

    // Notify
    entity.postNetworkUpdate();

    gf.log.write('<- update entity', entityId);
  }

  // Delete entities
  for (var n = 0; n < deleteEntityCount; n++) {
    // Read entity ID, uncompress into full ID
    var entityId = reader.readVarInt() << 1;

    // Find entity
    var entity = this.getEntity(entityId);
    if (!entity) {
      // Entity not found
      gf.log.debug('Target entity of server delete not found ' + entityId);
      return false;
    }

    // Remove from simulation
    this.removeEntity(entity);

    gf.log.write('<- delete entity', entityId);
  }

  // For each entity created we need to set parents
  if (parentingRequired) {
    for (var n = 0; n < parentingRequired.length; n++) {
      var entity = parentingRequired[n][0];
      var parentEntityId = parentingRequired[n][1];
      var parentEntity = this.getEntity(parentEntityId);
      if (!parentEntity) {
        // Entity not found
        gf.log.debug('Parent entity ' + parentEntityId + ' not found');
        return false;
      }
      entity.setParent(parentEntity);

      // Notify
      entity.postNetworkUpdate();
    }
  }

  // Commands
  for (var n = 0; n < commandCount; n++) {
    // Read command type
    var commandTypeId = reader.readVarInt();
    var commandFactory = this.getCommandFactory(commandTypeId);
    if (!commandFactory) {
      // Invalid command
      gf.log.debug('Invalid command type ' + commandTypeId + ' from server');
      return false;
    }

    // Read command data
    var command = commandFactory.allocate();
    command.read(reader);

    // Queue for processing
    this.incomingCommandList_.addCommand(command);
  }

  return true;
};
