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

goog.provide('gf.sim.commands.SetRootEntityCommand');

goog.require('gf.sim');
goog.require('gf.sim.Command');
goog.require('gf.sim.CommandFlag');
goog.require('gf.sim.commands.CommandType');



/**
 * Simulation command to set the root entity.
 *
 * @constructor
 * @extends {gf.sim.Command}
 * @param {!gf.sim.CommandFactory} commandFactory Command factory.
 */
gf.sim.commands.SetRootEntityCommand = function(commandFactory) {
  goog.base(this, commandFactory);

  /**
   * New root entity ID.
   * Can be {@see gf.sim#NO_ENTITY_ID} to unassign a root entity.
   * @type {number}
   */
  this.entityId = gf.sim.NO_ENTITY_ID;
};
goog.inherits(gf.sim.commands.SetRootEntityCommand, gf.sim.Command);


/**
 * @override
 */
gf.sim.commands.SetRootEntityCommand.prototype.read = function(
    reader, timeBase) {
  goog.base(this, 'read', reader, timeBase);

  this.entityId = reader.readVarInt();
};


/**
 * @override
 */
gf.sim.commands.SetRootEntityCommand.prototype.write = function(
    writer, timeBase) {
  goog.base(this, 'write', writer, timeBase);

  writer.writeVarInt(this.entityId);
};


/**
 * Command ID.
 * @const
 * @type {number}
 */
gf.sim.commands.SetRootEntityCommand.ID = gf.sim.createTypeId(
    gf.sim.GF_MODULE_ID, gf.sim.commands.CommandType.SET_ROOT_ENTITY);


/**
 * Command flags.
 * @const
 * @type {number}
 */
gf.sim.commands.SetRootEntityCommand.FLAGS = gf.sim.CommandFlag.GLOBAL;
