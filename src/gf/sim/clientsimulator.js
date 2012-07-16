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

goog.require('gf.net.NetworkService');
goog.require('gf.sim.CommandList');
goog.require('gf.sim.EntityFlags');
goog.require('gf.sim.PredictedCommandList');
goog.require('gf.sim.Simulator');
goog.require('goog.array');



/**
 * Client simulation component.
 * Runs the client-side entity simulation, handling commands and updating
 * entities.
 *
 * @constructor
 * @extends {gf.sim.Simulator}
 * @param {!gf.Runtime} runtime Runtime instance.
 * @param {!gf.net.ServerSession} session Network session.
 */
gf.sim.ClientSimulator = function(runtime, session) {
  goog.base(this, runtime, 1);

  /**
   * Network session.
   * @private
   * @type {!gf.net.ClientSession}
   */
  this.session_ = session;

  /**
   * Simulator network service.
   * @private
   * @type {!gf.sim.ClientSimulator.NetService_}
   */
  this.netService_ = new gf.sim.ClientSimulator.NetService_(this, session);
  this.registerDisposable(this.netService_);

  // TODO(benvanik): slotted list
  /**
   * A list of entities needing prediction.
   * @private
   * @type {!Array.<!gf.sim.ClientEntity>}
   */
  this.predictedEntities_ = [];

  /**
   * List of incoming commands from the network.
   * Commands will be processed on the next update.
   * @private
   * @type {!gf.sim.CommandList}
   */
  this.incomingCommandList_ = new gf.sim.CommandList();

  /**
   * List of outgoing commands to the network.
   * Contains logic for predicted commands; both those sent to the server and
   * unconfirmed
   * ({@see gf.sim.PredictedCommandList#getUnconfirmedPredictedArray}) and
   * those waiting to be sent
   * ({@see gf.sim.PredictedCommandList#getOutgoingPredictedArray}).
   * @private
   * @type {!gf.sim.CommandList}
   */
  this.outgoingCommandList_ = new gf.sim.PredictedCommandList();

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
  if (entity.getFlags() & gf.sim.EntityFlags.PREDICTED) {
    this.predictedEntities_.push(entity);
  }
};


/**
 * @override
 */
gf.sim.ClientSimulator.prototype.removeEntity = function(entity) {
  goog.base(this, 'removeEntity', entity);

  // Un-track predicted entities
  // TODO(benvanik): faster removal via slotted list
  if (entity.getFlags() & gf.sim.EntityFlags.PREDICTED) {
    goog.array.remove(this.predictedEntities_, entity);
  }
};


/**
 * Whether client-side prediction is enabled.
 * @private
 * @const
 * @type {boolean}
 */
gf.sim.ClientSimulator.PREDICTION_ENABLED_ = true;


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
  // Poll network to find new packets
  // TODO(benvanik): poll network

  // Process sync packets
  // TODO(benvanik): process sync packets, adding/updating/deleting entities
  var confirmedSequence = 0;

  // Confirm commands and remove them from the unconfirmed list
  this.outgoingCommandList_.confirmSequence(confirmedSequence);

  // Apply server state updates
  // This must be done before command processing to ensure that any entities
  // required have been created
  // call entity.preUpdate(frame) if it changed in the sync

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

  // Compact, if needed - this prevents memory leaks from caches
  this.compact_();
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
  var delta = frame.time - this.lastSendTime_;
  if (delta >= gf.sim.ClientSimulator.CLIENT_UPDATE_RATE_) {
    this.lastSendTime_ = frame.time;

    // Build command packet
    //this.outgoingCommandList_.write(writer);
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
 */
gf.sim.ClientSimulator.prototype.compact_ = function() {
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
 * Runs client-side prediction code by executing all commands that have been
 * unconfirmed or unsent to the server.
 * When this function returns the entity state will be the predicted state.
 * It should be called every render frame before running local physics/etc.
 * @param {!gf.RenderFrame} frame Current render frame.
 */
gf.sim.ClientSimulator.prototype.predictEntities =
    gf.sim.ClientSimulator.PREDICTION_ENABLED_ ? function(frame) {
  // Reset predicted entities to their confirmed states
  for (var n = 0; n < this.predictedEntities_.length; n++) {
    var entity = this.predictedEntities_[n];

    // TODO(benvanik): reset state
  }

  // Execute prediction commands
  this.outgoingCommandList_.executePrediction(this);
} : goog.nullFunction;



/**
 * Manages dispatching client simulator packets.
 * @private
 * @constructor
 * @extends {gf.net.NetworkService}
 * @param {!gf.sim.ClientSimulator} simulator Simulator.
 * @param {!gf.net.ClientSession} session Session.
 */
gf.sim.ClientSimulator.NetService_ = function(simulator, session) {
  goog.base(this, session);

  /**
   * Client simulator.
   * @private
   * @type {!gf.sim.ClientSimulator}
   */
  this.simulator_ = simulator;

  /**
   * Client session.
   * @private
   * @type {!gf.net.ClientSession}
   */
  this.clientSession_ = session;
};
goog.inherits(gf.sim.ClientSimulator.NetService_, gf.net.NetworkService);


/**
 * @override
 */
gf.sim.ClientSimulator.NetService_.prototype.setupSwitch =
    function(packetSwitch) {
  // TODO(benvanik): register packets
};
