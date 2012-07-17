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

goog.provide('gf.sim.SyncSimulationWriter');

goog.require('gf.log');
goog.require('gf.net.PacketWriter');
goog.require('gf.sim.packets.SyncSimulation');



/**
 * Optimized utility for writing sync packets.
 * Attempts to create little-to-no garbage while sorting data.
 *
 * @constructor
 */
gf.sim.SyncSimulationWriter = function() {
  /**
   * Confirmed sequence number.
   * @private
   * @type {number}
   */
  this.confirmedSequence_ = 0;

  /**
   * A list of command actions.
   * Length is defined by {@see #commandCount_}.
   * @private
   * @type {!Array.<gf.sim.Command>}
   */
  this.commands_ = [];

  /**
   * Length of {@see #commands_}.
   * @private
   * @type {number}
   */
  this.commandCount_ = 0;

  /**
   * A list of create entity actions.
   * Length is defined by {@see #createEntityCount_}.
   * @private
   * @type {!Array.<gf.sim.ServerEntity>}
   */
  this.createEntities_ = [];

  /**
   * Length of {@see #createEntities_}.
   * @private
   * @type {number}
   */
  this.createEntityCount_ = 0;

  /**
   * A list of update entity actions.
   * Length is defined by {@see #updateEntityCount_}.
   * @private
   * @type {!Array.<gf.sim.ServerEntity>}
   */
  this.updateEntities_ = [];

  /**
   * Length of {@see #updateEntities_}.
   * @private
   * @type {number}
   */
  this.updateEntityCount_ = 0;

  /**
   * A list of delete entity actions.
   * Length is defined by {@see #deleteEntityCount_}.
   * @private
   * @type {!Array.<gf.sim.ServerEntity>}
   */
  this.deleteEntities_ = [];

  /**
   * Length of {@see #deleteEntities_}.
   * @private
   * @type {number}
   */
  this.deleteEntityCount_ = 0;
};


/**
 * Begins writing the sync simulation packet.
 * @param {number} confirmedSequence Sequence number.
 */
gf.sim.SyncSimulationWriter.prototype.begin = function(confirmedSequence) {
  this.confirmedSequence_ = confirmedSequence;
};


/**
 * Adds a command action to the packet.
 * @param {!gf.sim.Command} command Command.
 */
gf.sim.SyncSimulationWriter.prototype.addCommand = function(command) {
  this.commands_[this.commandCount_++] = command;
};


/**
 * Adds a create entity action to the packet.
 * @param {!gf.sim.ServerEntity} entity Entity.
 */
gf.sim.SyncSimulationWriter.prototype.addCreateEntity = function(entity) {
  this.createEntities_[this.createEntityCount_++] = entity;
};


/**
 * Adds an update entity action to the packet.
 * @param {!gf.sim.ServerEntity} entity Entity.
 */
gf.sim.SyncSimulationWriter.prototype.addUpdateEntity = function(entity) {
  this.updateEntities_[this.updateEntityCount_++] = entity;
};


/**
 * Adds a delete entity action to the packet.
 * @param {!gf.sim.ServerEntity} entity Entity.
 */
gf.sim.SyncSimulationWriter.prototype.addDeleteEntity = function(entity) {
  this.deleteEntities_[this.deleteEntityCount_++] = entity;
};


/**
 * Ends the writing operation and returns the final packet.
 * @return {!ArrayBuffer} Finalized packet for sending.
 */
gf.sim.SyncSimulationWriter.prototype.finish = function() {
  // Add header
  var writer = gf.net.PacketWriter.getSharedWriter();
  gf.sim.packets.SyncSimulation.write(
      writer, gf.sim.packets.SyncSimulation.writeInstance);

  // Write header data
  // TODO(benvanik): could pack the header very tightly
  writer.writeVarInt(this.confirmedSequence_);
  writer.writeVarInt(this.createEntityCount_);
  writer.writeVarInt(this.updateEntityCount_);
  writer.writeVarInt(this.deleteEntityCount_);
  writer.writeVarInt(this.commandCount_);

  // Create entities
  for (var n = 0; n < this.createEntityCount_; n++) {
    var entity = this.createEntities_[n];
    this.createEntities_[n] = null; // prevent leaks

    // Write target entity ID
    // Since only server IDs are being sent we cheat and send shifted by 1
    writer.writeVarInt(entity.getId() >> 1);

    // TODO(benvanik): write entity create
    gf.log.write('-> create entity', entity.getId());
  }
  this.createEntityCount_ = 0;

  // Update entities
  for (var n = 0; n < this.updateEntityCount_; n++) {
    var entity = this.updateEntities_[n];
    this.updateEntities_[n] = null; // prevent leaks

    // Write target entity ID
    // Since only server IDs are being sent we cheat and send shifted by 1
    writer.writeVarInt(entity.getId() >> 1);

    // TODO(benvanik): write entity update
    gf.log.write('-> update entity', entity.getId());
  }
  this.updateEntityCount_ = 0;

  // Delete entities
  for (var n = 0; n < this.deleteEntityCount_; n++) {
    var entity = this.deleteEntities_[n];
    this.deleteEntities_[n] = null; // prevent leaks

    // Write target entity ID
    // Since only server IDs are being sent we cheat and send shifted by 1
    writer.writeVarInt(entity.getId() >> 1);

    gf.log.write('-> delete entity', entity.getId());
  }
  this.deleteEntityCount_ = 0;

  // Commands
  for (var n = 0; n < this.commandCount_; n++) {
    var command = this.commands_[n];
    this.commands_[n] = null; // prevent leaks

    // Write command ID and contents
    writer.writeVarInt(command.commandType.typeId);
    command.write(writer);

    gf.log.write('-> command');
  }
  this.commandCount_ = 0;

  // Finish
  return writer.finish();
};
