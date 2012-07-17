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

goog.provide('gf.sim.commands.ReparentCommand');

goog.require('gf.sim');
goog.require('gf.sim.Command');
goog.require('gf.sim.commands.CommandType');



/**
 * Simulation command to reparent entities.
 * Reparent commands must target entities and will reassign their parents.
 *
 * @constructor
 * @extends {gf.sim.Command}
 * @param {!gf.sim.CommandType} commandType Command type.
 */
gf.sim.commands.ReparentCommand = function(commandType) {
  goog.base(this, commandType);

  /**
   * New parent entity ID.
   * Can be {@see gf.sim#NO_ENTITY_ID} to unassign a parent.
   * @type {number}
   */
  this.parentId = gf.sim.NO_ENTITY_ID;
};
goog.inherits(gf.sim.commands.ReparentCommand, gf.sim.Command);


/**
 * @override
 */
gf.sim.commands.ReparentCommand.prototype.read = function(reader) {
  goog.base(this, 'read', reader);

  this.parentId = reader.readVarInt();
};


/**
 * @override
 */
gf.sim.commands.ReparentCommand.prototype.write = function(writer) {
  goog.base(this, 'write', writer);

  writer.writeVarInt(this.parentId);
};


/**
 * Command ID.
 * @const
 * @type {number}
 */
gf.sim.commands.ReparentCommand.ID = gf.sim.createTypeId(
    gf.sim.GF_MODULE_ID, gf.sim.commands.CommandType.REPARENT);
