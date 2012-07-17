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

goog.provide('gf.sim.CommandFactory');

goog.require('gf.sim');



/**
 * Command type descriptor.
 * Aids in serializing and deserializing commands, as well as provides a
 * pool of commands to prevent allocations.
 *
 * @constructor
 * @param {number} typeId Command type ID.
 * @param {!function(new:gf.sim.Command, !gf.sim.CommandFactory)} commandCtor
 *     Command constructor.
 */
gf.sim.CommandFactory = function(typeId, commandCtor) {
  /**
   * Command type ID.
   * @type {number}
   */
  this.typeId = typeId;

  /**
   * Constructor for the command type.
   * @private
   * @type {!function(new:gf.sim.Command, !gf.sim.CommandFactory)}
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
gf.sim.CommandFactory.prototype.allocate = function() {
  if (this.unusedCommands_.length) {
    var command = this.unusedCommands_.pop();
    // Reset the important fields that everyone will mess up
    command.targetEntityId = gf.sim.NO_ENTITY_ID;
    return command;
  } else {
    return new this.commandCtor_(this);
  }
};


/**
 * Releases a command to the pool.
 * @param {!gf.sim.Command} command Command to release.
 */
gf.sim.CommandFactory.prototype.release = function(command) {
  this.unusedCommands_.push(command);
};
