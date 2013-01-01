/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
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

goog.provide('gf.sim.util.PredictedCommandList');

goog.require('gf.log');
goog.require('gf.sim.PredictedCommand');
goog.require('goog.asserts');



/**
 * A command list for handling client-side prediction.
 * Predicted commands are stored separately in a form that enables fast
 * sends and re-execution.
 *
 * @constructor
 */
gf.sim.util.PredictedCommandList = function() {
  /**
   * Next unique sequence ID.
   * @private
   * @type {number}
   */
  this.nextSequenceId_ = 1;

  /**
   * Sent but unconfirmed command array.
   * @private
   * @type {!Array.<!gf.sim.PredictedCommand>}
   */
  this.unconfirmedPredictedArray_ = [];

  /**
   * Number of commands currently in the sent but unconfirmed list.
   * @private
   * @type {number}
   */
  this.unconfirmedPredictedCount_ = 0;

  /**
   * Unsent command array, containing both normal and predicted commands.
   * The size of this array does not correspond to the number of valid commands
   * inside of it. Use {@see #getCount} for the real count.
   * @private
   * @type {!Array.<gf.sim.Command>}
   */
  this.outgoingArray_ = [];

  /**
   * Number of combined (normal and predicted) commands currently in the list.
   * @private
   * @type {number}
   */
  this.outgoingCount_ = 0;

  /**
   * Unsent predicted command array.
   * @private
   * @type {!Array.<!gf.sim.PredictedCommand>}
   */
  this.outgoingPredictedArray_ = [];

  /**
   * Number of commands currently in the pending send list list.
   * @private
   * @type {number}
   */
  this.outgoingPredictedCount_ = 0;
};


/**
 * Compacts the command list.
 * This should be called somewhat frequently to ensure the lists do not grow
 * without bound.
 */
gf.sim.util.PredictedCommandList.prototype.compact = function() {
  // TODO(benvanik): compaction
};


/**
 * Confirms commands from the server up to and including the given sequence ID.
 * @param {number} sequence Sequence identifier.
 */
gf.sim.util.PredictedCommandList.prototype.confirmSequence = function(
    sequence) {
  var unconfirmedList = this.unconfirmedPredictedArray_;
  var unconfirmedCount = this.unconfirmedPredictedCount_;
  if (!unconfirmedCount) {
    return;
  }

  var lastCommand = unconfirmedList[unconfirmedCount - 1];
  if (lastCommand.sequence <= sequence) {
    // All commands confirmed - release all
    for (var n = 0; n < unconfirmedCount; n++) {
      var command = unconfirmedList[n];
      command.factory.release(command);
    }
    this.unconfirmedPredictedCount_ = 0;
  } else {
    // Run through until we find a command that hasn't been confirmed
    var killCount = unconfirmedCount;
    for (var n = 0; n < unconfirmedCount; n++) {
      var command = unconfirmedList[n];

      // If we are not yet confirmed, abort
      if (command.sequence > sequence) {
        killCount = n;
        break;
      }

      // Release to pool
      command.factory.release(command);
    }

    // Remove confirmed commands
    // TODO(benvanik): don't splice here
    unconfirmedList.splice(0, killCount);
    this.unconfirmedPredictedCount_ -= killCount;
  }
};


/**
 * Adds a command to the list.
 * @param {!gf.sim.Command} command Command to add.
 */
gf.sim.util.PredictedCommandList.prototype.addCommand = function(command) {
  this.outgoingArray_[this.outgoingCount_++] = command;

  // Assign predicted commands sequence numbers and add to tracking list
  if (command instanceof gf.sim.PredictedCommand) {
    command.sequence = this.nextSequenceId_++;
    command.hasPredicted = false;
    this.outgoingPredictedArray_[this.outgoingPredictedCount_++] = command;
  }
};


/**
 * @return {boolean} True if there are any outgoing packets waiting to be sent.
 */
gf.sim.util.PredictedCommandList.prototype.hasOutgoing = function() {
  return !!this.outgoingCount_;
};


/**
 * Writes the command list to the given packet writer, managing prediction
 * state.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 * @return {number} Number of commands written.
 */
gf.sim.util.PredictedCommandList.prototype.write = function(writer) {
  goog.asserts.assert(this.outgoingCount_);

  // Write sequence high number
  writer.writeVarUint(this.nextSequenceId_ - 1);

  // Write count
  var writtenCount = this.outgoingCount_;
  writer.writeVarUint(this.outgoingCount_);

  // Move all pending commands to the unconfirmed list to use for prediction
  for (var n = 0; n < this.outgoingCount_; n++) {
    var command = this.outgoingArray_[n];
    goog.asserts.assert(command);
    this.outgoingArray_[n] = null;

    // Add command to packet
    writer.writeVarUint(command.factory.typeId);
    command.write(writer);

    // Cleanup command
    if (command instanceof gf.sim.PredictedCommand) {
      // Predicted - it's part of the sequence flow
      // Keep it around so we can re-execute it
      this.unconfirmedPredictedArray_[this.unconfirmedPredictedCount_++] =
          command;
    } else {
      // Unpredicted - just release now, as it doesn't matter
      command.factory.release(command);
    }
  }

  // Reset lists
  // All pending predicted commands were added to the unconfirmed list above
  this.outgoingCount_ = 0;
  this.outgoingPredictedCount_ = 0;

  // Check to see if we've blocked up
  if (this.unconfirmedPredictedCount_ > 1500) {
    gf.log.write('massive backup of commands, dying');
    // TODO(benvanik): death flag
  }

  return writtenCount;
};


/**
 * Executes all prediction commands against the simulator.
 * @param {!gf.sim.Simulator} simulator Target simulator.
 */
gf.sim.util.PredictedCommandList.prototype.executePrediction = function(
    simulator) {
  // Predict all sent but unconfirmed commands
  simulator.executeCommands(
      this.unconfirmedPredictedArray_,
      this.unconfirmedPredictedCount_);

  // Predict all unsent commands
  simulator.executeCommands(
      this.outgoingPredictedArray_,
      this.outgoingPredictedCount_);

  /*
   * This code does not seem to be needed, though it should be.
   * It tries to interpolate the state from last frame with the state from
   * this frame, post-prediction. I think it's most useful when there's the
   * possibility of skew between client/server and there is correction required.
   * Right now if there's a difference between client/server the client will
   * snap to the new position in potentially weird ways.

  // TODO(benvanik): prevent alloc
  var pastState = entity.state.clone();

  // Run all unconfirmed commands
  for (var n = 0; n < this.unconfirmedCommands_.length; n++) {
    var cmd = this.unconfirmedCommands_[n];
    if (cmd.time >= frame.time) {
      break;
    }
    pastState.setFromState(entity.state);
    this.executeCommand(frame.time, cmd);
  }

  // Run all unsent commands
  for (var n = 0; n < this.pendingCommands_.length; n++) {
    var cmd = this.pendingCommands_[n];
    if (cmd.time >= frame.time) {
      break;
    }
    pastState.setFromState(entity.state);
    this.executeCommand(frame.time, cmd);
  }

  // Lerp the last two states
  var futureState = entity.state;
  if (pastState.time != futureState.time) {
    var tt = frame.time - (200 / 1000);
    var duration = futureState.time - pastState.time;
    var baseTime = tt - pastState.time;
    var t = baseTime / (futureState.time - pastState.time);
    gf.log.write(tt, pastState.time, futureState.time, t);
    t = goog.math.clamp(t, 0, 1);
    blk.env.EntityState.interpolate(pastState, futureState, t,
        entity.state);
  }

  // State should now be up to date!
  gf.log.write(entity.state.position[0], entity.state.position[1],
      entity.state.position[2]);
  */
};
