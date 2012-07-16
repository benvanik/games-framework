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
goog.require('gf.net.NetworkService');
goog.require('gf.sim.PredictedCommand');
goog.require('gf.sim.Simulator');



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

  /**
   * A list of entities needing prediction.
   * @private
   * @type {!Array.<!gf.sim.ClientEntity>}
   */
  this.predictedEntities_ = [];

  /**
   * Next unique sequence ID.
   * @private
   * @type {number}
   */
  this.nextSequenceId_ = 1;

  /**
   * Commands waiting to be sent to the server.
   * @private
   * @type {!Array.<!gf.sim.Command>}
   */
  this.pendingCommands_ = [];

  /**
   * Predicted commands that have not yet been confirmed by the server and
   * should be used for prediction.
   * @private
   * @type {!Array.<!gf.sim.PredictedCommand>}
   */
  this.unconfirmedPredictionCommands_ = [];

  /**
   * Predicted commands waiting to be sent to the server.
   * Used only for prediction.
   * @private
   * @type {!Array.<!gf.sim.PredictedCommand>}
   */
  this.pendingPredictionCommands_ = [];

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
  var commands = [];

  // Confirm commands and remove them from the unconfirmed list
  this.confirmCommands_(confirmedSequence);

  // Apply server state updates
  // This must be done before command processing to ensure that any entities
  // required have been created
  // call entity.preUpdate(frame) if it changed in the sync

  // Process incoming commands
  this.executeCommands(commands);

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
 * Confirms commands from the server up to and including the given sequence ID.
 * @private
 * @param {number} sequence Sequence identifier.
 */
gf.sim.ClientSimulator.prototype.confirmCommands_ = function(sequence) {
  var commands = this.unconfirmedPredictionCommands_;
  if (!commands.length) {
    return;
  }

  if (commands[commands.length - 1].sequence <= sequence) {
    // All commands confirmed - release all pool
    var lastType = null;
    for (var n = 0; n < commands.length; n++) {
      var command = commands[n];
      if (!lastType || command.typeId != lastType.typeId) {
        lastType = this.getCommandType(command.typeId);
      }
      lastType.release(command);
    }
    commands.length = 0;
  } else {
    // Run through until we find a command that hasn't been confirmed
    var killCount = commands.length;
    var lastType = null;
    for (var n = 0; n < commands.length; n++) {
      var command = commands[n];

      // If we are not yet confirmed, abort
      if (command.sequence > sequence) {
        killCount = n;
        break;
      }

      // Release to pool
      if (!lastType || command.typeId != lastType.typeId) {
        lastType = this.getCommandType(command.typeId);
      }
      lastType.release(command);
    }

    // Remove confirmed commands
    commands.splice(0, killCount);
  }
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
  this.pendingCommands_.push(command);

  // Assign predicted commands sequence numbers and add to tracking list
  if (command instanceof gf.sim.PredictedCommand) {
    command.sequence = this.nextSequenceId_++;
    command.hasPredicted = false;
    this.pendingPredictionCommands_.push(command);
  }
};


/**
 * Sends any pending commands generated during the current update.
 * @private
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.ClientSimulator.prototype.sendPendingCommands_ = function(frame) {
  if (!this.pendingCommands_.length) {
    return;
  }

  var delta = frame.time - this.lastSendTime_;
  if (delta >= gf.sim.ClientSimulator.CLIENT_UPDATE_RATE_) {
    this.lastSendTime_ = frame.time;

    // Build command packet
    // Move all pending commands to the unconfirmed list to use for prediction
    var lastType = null;
    for (var n = 0; n < this.pendingCommands_.length; n++) {
      var command = this.pendingCommands_[n];

      // Add command to packet
      // TODO(benvanik): add to packet

      // Cleanup command
      if (command instanceof gf.sim.PredictedCommand) {
        // Predicted - it's part of the sequence flow
        // Keep it around so we can re-execute it
        this.unconfirmedPredictionCommands_.push(command);
      } else {
        // Unpredicted - just release now, as it doesn't matter
        if (!lastType || command.typeId != lastType.typeId) {
          lastType = this.getCommandType(command.typeId);
        }
        lastType.release(command);
      }
    }

    // Reset lists
    // All pending predicted commands were added to the unconfirmed list above
    this.pendingCommands_.length = 0;
    this.pendingPredictionCommands_.length = 0;
  }

  // Check to see if we've blocked up
  if (this.unconfirmedPredictionCommands_.length > 1500) {
    gf.log.debug('massive backup of commands, dying');
    // TODO(benvanik): death flag
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
};


/**
 * Runs client-side prediction code by executing all commands that have been
 * unconfirmed or unsent to the server.
 * When this function returns the entity state will be the predicted state.
 * It should be called every render frame before running local physics/etc.
 * @param {!gf.RenderFrame} frame Current render frame.
 */
gf.sim.ClientSimulator.prototype.predictEntities = function(frame) {
  // Reset predicted entities to their confirmed states
  for (var n = 0; n < this.predictedEntities_.length; n++) {
    var entity = this.predictedEntities_[n];
  }

  if (gf.sim.ClientSimulator.PREDICTION_ENABLED_) {
    // Predict all sent but unconfirmed commands
    this.executeCommands(this.unconfirmedPredictionCommands_);

    // Predict all unsent commands
    this.executeCommands(this.pendingPredictionCommands_);
  }
};



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
