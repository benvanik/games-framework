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
goog.provide('gf.sim.CommandType');
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
 */
gf.sim.Command = function() {
  /**
   * Command type ID.
   * @type {number}
   */
  this.typeId = typeId;

  /**
   * Game simulation time the command was generated, in seconds.
   * @type {number}
   */
  this.time = 0;

  /**
   * Target entity ID.
   * May be {@see gf.sim#NO_ENTITY_ID} to target the global scope.
   * @type {number}
   */
  this.targetEntityId = gf.sim.NO_ENTITY_ID;
};



/**
 * Simulation command supporting prediction.
 *
 * @constructor
 * @extends {gf.sim.Command}
 */
gf.sim.PredictedCommand = function() {
  goog.base(this);

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
 * Command type descriptor.
 * Aids in serializing and deserializing commands, as well as provides a
 * pool of commands to prevent allocations.
 *
 * @constructor
 * @param {number} typeId Command type ID.
 * @param {!function(new:gf.sim.Command)} commandCtor Command constructor.
 */
gf.sim.CommandType = function(typeId, commandCtor) {
  /**
   * Command type ID.
   * @type {number}
   */
  this.typeId = typeId;

  /**
   * Constructor for the command type.
   * @private
   * @type {!function(new:gf.sim.Command)}
   */
  this.commandCtor_ = commandCtor;

  /**
   * Unused command instances.
   * @private
   * @type {!Array.<!gf.sim.Command>}
   */
  this.unusedCommands_ = [];
};


/**
 * Allocates a command to use from the pool.
 * The returned command will have random values and must be fully reset.
 * @return {!gf.sim.Command} A new or re-used command. Uninitialized.
 */
gf.sim.CommandType.prototype.allocate = function() {
  if (this.unusedCommands_.length) {
    var command = this.unusedCommands_.pop();
    // Reset the important fields that everyone will mess up
    command.targetEntityId = gf.sim.NO_ENTITY_ID;
    return command;
  } else {
    var command = new this.commandCtor_();
    command.typeId = this.typeId;
    return command;
  }
};


/**
 * Releases a command to the pool.
 * @param {!gf.sim.Command} command Command to release.
 */
gf.sim.CommandType.prototype.release = function(command) {
  this.unusedCommands_.push(command);
};
