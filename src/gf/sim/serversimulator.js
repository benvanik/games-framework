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
goog.require('gf.sim.CommandList');
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
 */
gf.sim.ServerSimulator = function(runtime, session) {
  goog.base(this, runtime, 2);

  /**
   * Network session.
   * @private
   * @type {!gf.net.ServerSession}
   */
  this.session_ = session;

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
   * List of incoming commands from the network.
   * Commands will be processed on the next update.
   * @private
   * @type {!gf.sim.CommandList}
   */
  this.incomingCommandList_ = new gf.sim.CommandList();

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
  // Poll network to find new packets
  // TODO(benvanik): poll network

  // Process incoming commands
  this.executeCommands(
      this.incomingCommandList_.getArray(),
      this.incomingCommandList_.getCount());
  this.incomingCommandList_.releaseAllCommands();

  // Run scheduled events
  this.getScheduler().update(frame);

  // Perform post-update work on entities that were marked as dirty
  this.postTickUpdateEntities(frame);

  // Flush observers of any pending changes
  this.flushAll_(frame);

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
    observer.queueCommand(command);
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
    observer.queueCommand(command);
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

  // TODO(benvanik): something with each entity? maybe pack/prepare data?

  // Notify all observers about the entity change
  for (var n = 0; n < this.observers_.length; n++) {
    var observer = this.observers_[n];
    observer.notifyEntityChange(entity);
  }
};


/**
 * Flushes all observers at the end of a frame.
 * @private
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.ServerSimulator.prototype.flushAll_ = function(frame) {
  // Flush observers
  for (var n = 0; n < this.observers_.length; n++) {
    var observer = this.observers_[n];
    observer.flush(frame.time);
  }

  // Cleanup any outstanding release requests
  this.cleanupCommandList_.releaseAllCommands(this);
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
  this.incomingCommandList_.compact();
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
  // TODO(benvanik): register packets
};
