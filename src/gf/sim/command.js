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
