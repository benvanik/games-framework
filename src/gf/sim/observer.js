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

goog.provide('gf.sim.Observer');
goog.provide('gf.sim.ObserverCtor');

goog.require('gf.sim');
goog.require('gf.sim.EntityDirtyFlag');
goog.require('gf.sim.EntityFlag');
goog.require('gf.sim.util.CommandList');
goog.require('gf.sim.util.SyncSimulationWriter');
goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * Constructor function for {@see gf.sim.Observer} types.
 * @typedef {function(new:gf.sim.Observer, !gf.sim.ServerSimulator,
 *     !gf.net.ServerSession, !gf.net.User)}
 */
gf.sim.ObserverCtor;



/**
 * A server-side simulation observer.
 * Observers are stateful entity trackers with a position in the world and
 * enough information to determine if entities are interesting to it or not.
 *
 * Commonly observers have a limited interest radius and watch for entities near
 * them only. This can greatly optimize network bandwidth and reduce cheating.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.sim.ServerSimulator} simulator Server simulator.
 * @param {!gf.net.ServerSession} session Network session.
 * @param {!gf.net.User} user User this observer is representing.
 */
gf.sim.Observer = function(simulator, session, user) {
  goog.base(this);

  /**
   * Server simulator.
   * @private
   * @type {!gf.sim.ServerSimulator}
   */
  this.simulator_ = simulator;

  /**
   * Network session.
   * @private
   * @type {!gf.net.ServerSession}
   */
  this.session_ = session;

  /**
   * The user this observer is representing.
   * @private
   * @type {!gf.net.User}
   */
  this.user_ = user;

  /**
   * Last sequence number sent to the client.
   * @private
   * @type {number}
   */
  this.lastSentSequence_ = 0;

  /**
   * Confirmed sequence number.
   * May be pending send.
   * @private
   * @type {number}
   */
  this.confirmedSequence_ = 0;

  /**
   * List of incoming commands from the network.
   * Commands will be processed on the next update.
   * @private
   * @type {!gf.sim.util.CommandList}
   */
  this.incomingCommandList_ = new gf.sim.util.CommandList();

  /**
   * A list of pending commands to send to the observer on the next flush.
   * This list is not filtered by relevance and must be checked on flush.
   * @private
   * @type {!gf.sim.util.CommandList}
   */
  this.outgoingCommandList_ = new gf.sim.util.CommandList();

  /**
   * A set of entities currently tracked by this observer.
   * Tracked entities have been fully replicated and, on update, can have just
   * their deltas sent. If an entity is not in this set, is updated, and has
   * just become relevant then it must be added and fully replicated.
   * @private
   * @type {!Object.<number, boolean>}
   */
  this.trackedEntities_ = {};

  /**
   * A set of all dirty entities, mapped by entity ID.
   * This list is updated over the course of a server tick with all of the
   * entities that have changed and need synchronization.
   * The value is the OR of all dirty flags that have been seen since the entity
   * was last flushed. This allows for accumulation of multiple ticks worth of
   * change events before flushing.
   * @private
   * @type {!Object.<number, number>}
   */
  this.updatedEntitiesSet_ = {};

  /**
   * A list matching the set of entities in {@see #updatedEntitiesSet_}, kept
   * for fast iteration.
   * Check {@see gf.sim.Entity#dirtyFlags} to see whether the entity was
   * created, updated, and/or deleted this tick.
   * This list is cleared after every tick.
   * @private
   * @type {!Array.<!gf.sim.Entity>}
   */
  this.updatedEntitiesList_ = [];

  /**
   * The last time the observer was flushed.
   * This is used to throttle updates so that they are not sent too frequently.
   * @private
   * @type {number}
   */
  this.lastFlushTime_ = 0;

  /**
   * Sync packet writer.
   * @private
   * @type {!gf.sim.util.SyncSimulationWriter}
   */
  this.writer_ = new gf.sim.util.SyncSimulationWriter(simulator.statistics);
};
goog.inherits(gf.sim.Observer, goog.Disposable);


/**
 * Gets the user this observer represents.
 * @return {!gf.net.User} User this observer represents.
 */
gf.sim.Observer.prototype.getUser = function() {
  return this.user_;
};


/**
 * Cleans up cached data that is no longer relevant.
 * This should be called with some frequency to prevent memory leaks.
 */
gf.sim.Observer.prototype.compact = function() {
  this.incomingCommandList_.compact();
  this.outgoingCommandList_.compact();
};


/**
 * Queues an incoming network command to be processed on the next tick.
 * @param {!gf.sim.Command} command Command to be processed.
 */
gf.sim.Observer.prototype.queueIncomingCommand = function(command) {
  // Add to the incoming list
  this.incomingCommandList_.addCommand(command);
};


/**
 * Sets the highest confirmed sequence number from the client.
 * @param {number} sequence Sequence number.
 */
gf.sim.Observer.prototype.setConfirmedSequence = function(sequence) {
  goog.asserts.assert(sequence >= this.confirmedSequence_);
  this.confirmedSequence_ = sequence;
};


/**
 * Executes all incoming commands against the simulator.
 */
gf.sim.Observer.prototype.executeIncomingCommands = function() {
  this.simulator_.executeCommands(
      this.incomingCommandList_.getArray(),
      this.incomingCommandList_.getCount());
  this.incomingCommandList_.releaseAllCommands();
};


/**
 * Queues a command for transmission on the next flush.
 * Commands targetting entities will only be sent if the entity is being
 * tracked.
 * The command is shared and should not be modified.
 * @param {!gf.sim.Command} command Command to send over the network.
 */
gf.sim.Observer.prototype.queueOutgoingCommand = function(command) {
  // Ignore commands that are owner-only and don't match our user
  // TODO(benvanik): make this check faster - perhaps cache entity on
  //     command instead of just ID?
  if (command.targetEntityId != gf.sim.NO_ENTITY_ID) {
    var entity = this.simulator_.getEntity(command.targetEntityId);
    if (entity.getFlags() & gf.sim.EntityFlag.OWNER_ONLY &&
        entity.getOwner() != this.user_) {
      return;
    }
  }

  // NOTE: we wait until flush to do the should-we-send logic to ensure
  // that we have a consistent state based on entity updates
  this.outgoingCommandList_.addCommand(command);
};


/**
 * Checks if the given entity (with its current dirty flags) is relevant to
 * the observer.
 * For example, if the entity is outside the visual range of the observer it
 * may still be relevant when created/deleted, but not when updated.
 * @param {!gf.sim.Entity} entity Entity to check.
 * @return {boolean} True if the entity is relevant.
 */
gf.sim.Observer.prototype.isEntityChangeRelevant = function(entity) {
  // Subclasses should check ownership, distance from entity position, etc
  return true;
};


/**
 * Notifies this observer that the given entity has been changed this tick.
 * This will only be called once per tick after the entity has been fully
 * updated.
 * @param {!gf.sim.Entity} entity Entity that changed this tick.
 */
gf.sim.Observer.prototype.notifyEntityChange = function(entity) {
  var entityFlags = entity.getFlags();

  // Don't replicate entities that aren't replicated
  if (entityFlags & gf.sim.EntityFlag.NOT_REPLICATED) {
    return;
  }

  // Don't replicate entities that are owner-only if this is not that user
  if (entityFlags & gf.sim.EntityFlag.OWNER_ONLY &&
      entity.getOwner() != this.user_) {
    return;
  }

  // Tracking changes
  var id = entity.getId();
  var wasTracked = this.trackedEntities_[id] || false;
  var isRelevant = this.isEntityChangeRelevant(entity);
  var dirtyFlags = 0;
  if (!wasTracked && !isRelevant) {
    // Not relevant at all - early-exit
    return;
  } else if (!wasTracked && isRelevant) {
    // Newly relevant, track and fully replicate
    dirtyFlags |= gf.sim.EntityDirtyFlag.CREATED;
    this.trackedEntities_[id] = true;
  } else if (wasTracked && !isRelevant) {
    // No longer relevant, untrack
    dirtyFlags |= gf.sim.EntityDirtyFlag.DELETED;
    delete this.trackedEntities_[id];
  }

  // Compute combined flags - both the ones we have calculated before, the
  // ones that come from the entity this tick, and the tracking changes
  // This enables us to know, out of band with server ticks, what we really
  // need to be sending the clients
  var existingFlags = this.updatedEntitiesSet_[id] | 0;
  var combinedFlags = existingFlags | dirtyFlags | entity.dirtyFlags;

  // Add to update set
  // Check to see if it's already in the set first, only changing if required
  // This enables the partial flushing of entity updates across multiple ticks
  if (!existingFlags) {
    // No existing update queued - queue in the list
    this.updatedEntitiesList_.push(entity);
  }

  // Update combined flags
  if (existingFlags != combinedFlags) {
    this.updatedEntitiesSet_[id] = combinedFlags;
  }
};


/**
 * Builds a sync packet based on the current dirty entities and resets state.
 * @param {number} time Current server time.
 */
gf.sim.Observer.prototype.flush = function(time) {
  var timeDelta = time - this.lastFlushTime_;
  this.lastFlushTime_ = time;
  // TODO(benvanik): ignore if not enough time has elapsed

  // Prepare packet
  var writer = this.writer_;
  writer.begin(this.confirmedSequence_);
  var needsSequenceFlush = this.confirmedSequence_ != this.lastSentSequence_;
  this.lastSentSequence_ = this.confirmedSequence_;

  // Commands
  var outgoingCommands = this.outgoingCommandList_.getArray();
  var outgoingCommandCount = this.outgoingCommandList_.getCount();
  if (outgoingCommandCount) {
    for (var n = 0; n < outgoingCommandCount; n++) {
      var command = outgoingCommands[n];

      // Check if the command targets an irrelevant entity
      if (command.targetEntityId != gf.sim.NO_ENTITY_ID) {
        if (!this.trackedEntities_[command.targetEntityId]) {
          // Not tracked - ignore
          continue;
        }
      }

      // Add command
      writer.addCommand(command);
    }
    this.outgoingCommandList_.resetList();
  }

  // For each relevant entity that changed this tick...
  for (var n = 0; n < this.updatedEntitiesList_.length; n++) {
    var entity = this.updatedEntitiesList_[n];

    // Remove from update set
    var id = entity.getId();
    var dirtyFlags = this.updatedEntitiesSet_[id];
    // TODO(benvanik): more efficient way? just set bits to zero and compact?
    delete this.updatedEntitiesSet_[id];

    // If the entity was created and deleted this tick, ignore entirely and
    // avoid sending to the client
    if (!dirtyFlags ||
        (dirtyFlags & gf.sim.EntityDirtyFlag.CREATED_AND_DELETED) ==
        gf.sim.EntityDirtyFlag.CREATED_AND_DELETED) {
      continue;
    }

    // Add create/update/delete based on flags
    if (dirtyFlags & gf.sim.EntityDirtyFlag.DELETED) {
      writer.addDeleteEntity(entity);
    } else if (dirtyFlags & gf.sim.EntityDirtyFlag.CREATED) {
      writer.addCreateEntity(entity);
    } else if (dirtyFlags & gf.sim.EntityDirtyFlag.UPDATED) {
      writer.addUpdateEntity(entity);
    }
  }

  // IFF we have a valid packet, emit -- note that we may send empty packets
  // if we need to flush a sequence confirmation number
  if (needsSequenceFlush || writer.hasContents()) {
    this.session_.send(writer.finish(time), this.user_);
  } else {
    writer.drop();
  }

  // Reset state for the next tick
  // TODO(benvanik): prevent this resize and reuse the list (being careful of
  //     leaks by nulling out above)
  this.updatedEntitiesList_.length = 0;
};
