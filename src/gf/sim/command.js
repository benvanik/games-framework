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

goog.provide('gf.sim.Command');
goog.provide('gf.sim.CommandFlag');
goog.provide('gf.sim.PredictedCommand');

goog.require('gf');
goog.require('gf.sim');
goog.require('goog.asserts');


/**
 * Bitmask flags for command types.
 * @enum {number}
 */
gf.sim.CommandFlag = {
  /**
   * Command has a time.
   * If this is not set then times are not serialized.
   */
  TIME: 1 << 1,

  /**
   * Command is global.
   */
  GLOBAL: 1 << 2
};



/**
 * Simulation command.
 * Used as a basic RPC mechanism. Commands are generated and queued to target
 * either the global simulation scope or individual entities.
 *
 * Commands are heavily pooled and should always reset completely.
 *
 * @constructor
 * @param {!gf.sim.CommandFactory} commandFactory Command factory.
 */
gf.sim.Command = function(commandFactory) {
  /**
   * Command type factory.
   * @type {!gf.sim.CommandFactory}
   */
  this.factory = commandFactory;

  /**
   * Game simulation time the command was generated, in seconds.
   * Quantized to 1ms.
   * @private
   * @type {number}
   */
  this.time_ = 0;

  // We don't have a separate EntityCommand that has this because almost all
  // commands are entity-specific
  /**
   * Target entity ID.
   * May be {@see gf.sim#NO_ENTITY_ID} to target the global scope.
   * @type {number}
   */
  this.targetEntityId = gf.sim.NO_ENTITY_ID;
};


/**
 * Gets the simulation time the command was generated.
 * @return {number} Simulation time, in seconds.
 */
gf.sim.Command.prototype.getTime = function() {
  return this.time_;
};


/**
 * Sets the simulation time the command was generated.
 * @param {number} value Time, in seconds.
 */
gf.sim.Command.prototype.setTime = function(value) {
  goog.asserts.assert(this.factory.flags & gf.sim.CommandFlag.TIME);
  this.time_ = ((value * 1000) | 0) / 1000;
};


/**
 * Reads the command contents from the given packet reader.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.Command.prototype.read = function(reader) {
  var flags = this.factory.flags;
  if (flags & gf.sim.CommandFlag.TIME) {
    this.time_ = reader.readVarUint() / 1000;
  }
  if (!(flags & gf.sim.CommandFlag.GLOBAL)) {
    this.targetEntityId = reader.readVarUint();
  }
};


/**
 * Writes the command to the given packet writer.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.Command.prototype.write = function(writer) {
  var flags = this.factory.flags;
  if (flags & gf.sim.CommandFlag.TIME) {
    writer.writeVarUint((this.time_ * 1000) | 0);
  }
  if (!(flags & gf.sim.CommandFlag.GLOBAL)) {
    writer.writeVarUint(this.targetEntityId);
  }
};


/**
 * Releases the command back to its parent pool.
 */
gf.sim.Command.prototype.release = function() {
  this.factory.release(this);
};



/**
 * Simulation command supporting prediction.
 * Predicted commands are replayed on the client each render frame from the last
 * confirmed predicted command from the server. This process is not cheap, and
 * as such prediction should only be used when required.
 *
 * When executing predicted commands clients should always check the
 * {@see #hasPredicted} flag and only create entities/perform actions if it is
 * false. Continuous actions such as changing velocity, however, should be run
 * regardless of whether its the first or a subsequent execution.
 *
 * @constructor
 * @extends {gf.sim.Command}
 * @param {!gf.sim.CommandFactory} commandFactory Command factory.
 */
gf.sim.PredictedCommand = function(commandFactory) {
  goog.base(this, commandFactory);

  /**
   * The time this command covers.
   * When sourcing from a client this is usually the frame time delta.
   * When executing the command and performing calculations over time, this
   * value should be used in place of any frame time from the engine.
   * @private
   * @type {number}
   */
  this.timeDelta_ = 0;

  if (gf.CLIENT) {
    /**
     * Sequence identifier.
     * Monotonically increasing number used for confirming commands.
     * This is only valid on the client
     * @type {number}
     */
    this.sequence = 0;
  }

  /**
   * Whether this command has been predicted on the client already.
   * This will be set to false on the first execution and true on all subsequent
   * ones. Commands that create entities/etc in response to commands must always
   * ensure they only do such on the first call.
   * @type {boolean}
   */
  this.hasPredicted = false;
};
goog.inherits(gf.sim.PredictedCommand, gf.sim.Command);


/**
 * Gets the time delta for this command.
 * @return {number} Time delta, in seconds.
 */
gf.sim.PredictedCommand.prototype.getTimeDelta = function() {
  return this.timeDelta_;
};


/**
 * Sets the time delta for this command.
 * @param {number} value Time delta, in seconds.
 */
gf.sim.PredictedCommand.prototype.setTimeDelta = function(value) {
  this.timeDelta_ = ((value * 1000) | 0) / 1000;
};


/**
 * @override
 */
gf.sim.PredictedCommand.prototype.read = function(reader) {
  goog.base(this, 'read', reader);

  this.timeDelta_ = reader.readVarUint() / 1000;

  // Always reset
  this.hasPredicted = false;
};


/**
 * @override
 */
gf.sim.PredictedCommand.prototype.write = function(writer) {
  goog.base(this, 'write', writer);

  writer.writeVarUint((this.timeDelta_ * 1000) | 0);
};


/**
 * Command flags.
 * @const
 * @type {number}
 */
gf.sim.PredictedCommand.FLAGS = gf.sim.CommandFlag.TIME;
