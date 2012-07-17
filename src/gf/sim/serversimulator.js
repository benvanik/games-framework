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

goog.provide('gf.sim.ServerSimulator');

goog.require('gf.log');
goog.require('gf.net.NetworkService');
goog.require('gf.net.packets.ExecCommands');
goog.require('gf.sim');
goog.require('gf.sim.CommandList');
goog.require('gf.sim.EntityFlag');
goog.require('gf.sim.Observer');
goog.require('gf.sim.Simulator');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Server simulation component.
 * Runs the server-side entity simulation, processing commands and sending out
 * updates to interested clients.
 *
 * @constructor
 * @extends {gf.sim.Simulator}
 * @param {!gf.Runtime} runtime Runtime instance.
 * @param {!gf.net.ServerSession} session Network session.
 * @param {!gf.sim.ObserverCtor} observerCtor Observer constructor.
 */
gf.sim.ServerSimulator = function(runtime, session, observerCtor) {
  goog.base(this, runtime, 2);

  /**
   * Network session.
   * @private
   * @type {!gf.net.ServerSession}
   */
  this.session_ = session;

  /**
   * Observer constructor.
   * @private
   * @type {!gf.sim.ObserverCtor}
   */
  this.observerCtor_ = observerCtor_;

  /**
   * Simulator network service.
   * @private
   * @type {!gf.sim.ServerSimulator.NetService_}
   */
  this.netService_ = new gf.sim.ServerSimulator.NetService_(this, session);
  this.registerDisposable(this.netService_);

  /**
   * A list of observers.
   * Observers watch for entity updates and should be checked every time entites
   * transition state in a tick.
   * @private
   * @type {!Array.<!gf.sim.Observer>}
   */
  this.observers_ = [];

  /**
   * Observers mapped by user session ID.
   * Provides a fast lookup when trying to send commands to specific users.
   * @private
   * @type {!Object.<!gf.sim.Observer>}
   */
  this.userObservers_ = {};

  /**
   * A list of commands that need to released after a full flush.
   * This is required because many commands are queued on multiple observers
   * and must only be released once. With this list it's possible to cleanup
   * all commands after all of the observers have processed.
   * @private
   * @type {!gf.sim.CommandList}
   */
  this.cleanupCommandList_ = new gf.sim.CommandList();
};
goog.inherits(gf.sim.ServerSimulator, gf.sim.Simulator);


/**
 * @override
 */
gf.sim.ServerSimulator.prototype.disposeInternal = function() {
  goog.disposeAll(this.observers_);

  goog.base(this, 'disposeInternal');
};


/**
 * Adds a new observer.
 * The observer will begin receiving entity updates on the next tick.
 * The given observer will transfer ownership to the simulator and be
 * disposed when it is removed.
 * @param {!gf.sim.Observer} observer Observer to add.
 */
gf.sim.ServerSimulator.prototype.addObserver = function(observer) {
  // Add to master list
  goog.asserts.assert(!goog.array.contains(this.observers_, observer));
  this.observers_.push(observer);

  // Track in the user->observer map
  var user = observer.user;
  if (user) {
    this.userObservers_[user.sessionId] = observer;
  }

  // TODO(benvanik): schedule creations for existing entities
};


/**
 * Gets the observer for the given user.
 * @param {!gf.net.User} user User.
 * @return {gf.sim.Observer} Observer for the given user, if it exists.
 */
gf.sim.ServerSimulator.prototype.getObserverForUser = function(user) {
  return this.userObservers_[user.sessionId] || null;
};


/**
 * Removes an observer.
 * @param {!gf.sim.Observer} observer Observer to remove.
 */
gf.sim.ServerSimulator.prototype.removeObserver = function(observer) {
  // Untrack in the user->observer map
  var user = observer.user;
  if (user) {
    delete this.userObservers_[user.sessionId];
  }

  // Remove from list and dispose (we own it)
  goog.array.remove(this.observers_, observer);
  goog.dispose(observer);
};


/**
 * @override
 */
gf.sim.ServerSimulator.prototype.update = function(frame) {
  // Process incoming commands for each observer
  for (var n = 0; n < this.observers_.length; n++) {
    var observer = this.observers_[n];
    observer.executeIncomingCommands();
  }

  // Run scheduled events
  this.getScheduler().update(frame);

  // Perform post-update work on entities that were marked as dirty, such
  // as queuing them for transmission
  this.postTickUpdateEntities(frame);

  // Flush observers of any pending changes, reset state
  this.postUpdate(frame);

  // Compact, if needed - this prevents memory leaks from caches
  this.compact_();
};


/**
 * @override
 */
gf.sim.ServerSimulator.prototype.executeCommand = function(command) {
  // TODO(benvanik): global commands
};


/**
 * Queues a command for transmission to all users.
 * @param {!gf.sim.Command} command Command to send over the network.
 * @param {gf.net.User=} opt_excludeUser Do not broadcast to the given user.
 */
gf.sim.ServerSimulator.prototype.broadcastCommand = function(
    command, opt_excludeUser) {
  // Queue on each observer
  for (var n = 0; n < this.observers_.length; n++) {
    var observer = this.observers_[n];
    if (opt_excludeUser && observer.user == opt_excludeUser) {
      // Skipped due to exclusion
      continue;
    }

    // Queue on observer
    observer.queueOutgoingCommand(command);
  }

  // Queue for release at a later time
  this.cleanupCommandList_.addCommand(command);
};


/**
 * Queues a command for transmission to a single user.
 * @param {!gf.sim.Command} command Command to send over the network.
 * @param {!gf.net.User} user Target user.
 */
gf.sim.ServerSimulator.prototype.sendCommand = function(command, user) {
  // Queue on observer
  var observer = this.userObservers_[user.sessionId];
  if (observer) {
    observer.queueOutgoingCommand(command);
  } else {
    gf.log.debug('unable to find user ' + user.sessionId + ' to queue command');
  }

  // Queue for release at a later time
  this.cleanupCommandList_.addCommand(command);
};


/**
 * @override
 */
gf.sim.ServerSimulator.prototype.postTickUpdateEntity = function(
    frame, genericEntity) {
  var entity = /** @type {!gf.sim.ServerEntity} */ (genericEntity);

  // Ignore if not replicated
  if (entity.getFlags() & gf.sim.EntityFlag.NOT_REPLICATED) {
    return;
  }

  // TODO(benvanik): something with each entity? maybe pack/prepare data?

  // Notify all observers about the entity change
  for (var n = 0; n < this.observers_.length; n++) {
    var observer = this.observers_[n];
    observer.notifyEntityChange(entity);
  }
};


/**
 * @override
 */
gf.sim.ServerSimulator.prototype.postUpdate = function(frame) {
  // Flush observers
  for (var n = 0; n < this.observers_.length; n++) {
    var observer = this.observers_[n];
    observer.flush(frame.time);
  }

  // Cleanup any outstanding release requests
  this.cleanupCommandList_.releaseAllCommands(this);

  goog.base(this, 'postUpdate', frame);
};


/**
 * Compaction interval, in seconds.
 * Doesn't need to be too frequent, but some caches grow without bound and
 * this must be called to prevent leaks.
 * @private
 * @const
 * @type {number}
 */
gf.sim.ServerSimulator.COMPACT_INTERVAL_ = 15;


/**
 * Cleans up cached data that is no longer relevant.
 * @private
 */
gf.sim.ServerSimulator.prototype.compact_ = function() {
  if (frame.time - this.lastCompactTime_ <
      gf.sim.ServerSimulator.COMPACT_INTERVAL_) {
    return;
  }
  this.lastCompactTime_ = frame.time;

  // TODO(benvanik): stage this out over multiple ticks to prevent spikes
  // TODO(benvanik): compact dirty entities list?

  // Compact command lists
  this.cleanupCommandList_.compact();

  // Compact all observers
  for (var n = 0; n < this.observers_.length; n++) {
    var observer = this.observers_[n];
    observer.compact();
  }
};



/**
 * Manages dispatching server simulator packets.
 * @private
 * @constructor
 * @extends {gf.net.NetworkService}
 * @param {!gf.sim.ServerSimulator} simulator Simulator.
 * @param {!gf.net.ServerSession} session Session.
 */
gf.sim.ServerSimulator.NetService_ = function(simulator, session) {
  goog.base(this, session);

  /**
   * Server simulator.
   * @private
   * @type {!gf.sim.ServerSimulator}
   */
  this.simulator_ = simulator;

  /**
   * Server session.
   * @private
   * @type {!gf.net.ServerSession}
   */
  this.serverSession_ = session;
};
goog.inherits(gf.sim.ServerSimulator.NetService_, gf.net.NetworkService);


/**
 * @override
 */
gf.sim.ServerSimulator.NetService_.prototype.setupSwitch =
    function(packetSwitch) {
  packetSwitch.register(
      gf.net.packets.ExecCommands.ID,
      this.handleExecCommands_, this);
};


/**
 * @override
 */
gf.sim.ServerSimulator.NetService_.userConnected = function(user) {
  // Ensure no existing observer - not sure this is possible
  var observer = this.simulator_.getObserverForUser(user);
  if (observer) {
    return;
  }

  // Create the observer and add to the simulator
  observer = new gf.sim.Observer(this.serverSession_, user);
  this.simulator_.addObserver(observer);
};


/**
 * @override
 */
gf.sim.ServerSimulator.NetService_.prototype.userDisconnected = function(user) {
  // Grab observer
  var observer = this.simulator_.getObserverForUser(user);
  if (!observer) {
    return;
  }

  // Remove from the simulator (and dispose implicitly)
  this.simulator_.removeObserver(observer);
};


/**
 * Handles command execution requests.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.sim.ServerSimulator.NetService_.prototype.handleExecCommands_ =
    function(packet, packetType, reader) {
  // Verify observer
  if (!packet.user) {
    return false;
  }
  var observer = this.simulator_.getObserverForUser(packet.user);
  if (!observer) {
    return false;
  }

  // Read header
  var commandCount = reader.readVarInt();

  // Commands
  for (var n = 0; n < commandCount; n++) {
    // Read command type
    var commandTypeId = reader.readVarInt();
    var commandType = this.simulator_.getCommandType(commandTypeId);
    if (!commandType) {
      // Invalid command
      gf.log.debug('Invalid command type ' + commandTypeId + ' from client');
      // TODO(benvanik): kill connection, as cannot parse the rest
      return false;
    }

    // Read command data
    var command = commandType.allocate();
    command.read(reader);

    // Limit command execution to entities owned by the user only
    // Basically:
    // - commands must target entities
    // - target entity must exist
    // - target entity must have owner == user
    // TODO(benvanik): better security around commands
    var invalidTarget = command.targetEntityId == gf.sim.NO_ENTITY_ID;
    if (!invalidTarget) {
      var entity = this.simulator_.getEntity(command.targetEntityId);
      invalidTarget = !entity || entity.getOwner() != packet.user;
    }
    if (invalidTarget) {
      // TODO(benvanik): kill connection
      gf.log.debug('Invalid client command target');
      command.release();
      return false;
    }

    // Queue on observer for processing
    observer.queueIncomingCommand(command);
  }

  return true;
};
