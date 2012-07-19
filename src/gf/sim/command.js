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
goog.provide('gf.sim.PredictedCommand');

goog.require('gf.sim');



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
   * @type {number}
   */
  this.time = 0;

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
 * Reads the command contents from the given packet reader.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.Command.prototype.read = function(reader) {
  this.time = reader.readUint32() / 1000;
  this.targetEntityId = reader.readVarInt();
};


/**
 * Writes the command to the given packet writer.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.Command.prototype.write = function(writer) {
  writer.writeUint32((this.time * 1000) | 0);
  writer.writeVarInt(this.targetEntityId);
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
   * Sequence identifier.
   * Monotonically increasing number used for confirming commands.
   * @type {number}
   */
  this.sequence = 0;

  /**
   * Amount of time this command covers, in seconds.
   * @type {number}
   */
  this.timeDelta = 0;

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
 * @override
 */
gf.sim.PredictedCommand.prototype.read = function(reader) {
  goog.base(this, 'read', reader);

  this.sequence = reader.readVarInt();
  this.timeDelta = reader.readUint32() / 1000;
};


/**
 * @override
 */
gf.sim.PredictedCommand.prototype.write = function(writer) {
  goog.base(this, 'write', writer);

  writer.writeVarInt(this.sequence);
  // TODO(benvanik): write compressed time - this could probably fit in 16bits
  writer.writeUint32((this.timeDelta * 1000) | 0);
};
