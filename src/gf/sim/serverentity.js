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

goog.provide('gf.sim.ServerEntity');

goog.require('gf.sim.Entity');



/**
 * Server-side simulation entity base type.
 *
 * @constructor
 * @extends {gf.sim.Entity}
 * @param {!gf.sim.ClientSimulator} simulator Owning server simulator.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 */
gf.sim.ServerEntity = function(simulator, entityId, entityFlags) {
  goog.base(this, simulator, entityId, entityFlags);

  /**
   * Owning user, if any.
   * An owning user generally has more permission to modify an entity than
   * others. For example, an owning user can issue kill commands on themselves
   * but not on anyone else.
   * @private
   * @type {gf.net.User}
   */
  this.owner_ = null;
};
goog.inherits(gf.sim.ServerEntity, gf.sim.Entity);


/**
 * Gets the server simulator that owns this entity.
 * @return {!gf.sim.ServerSimulator} Simulator.
 */
gf.sim.ServerEntity.prototype.getSimulator = function() {
  return this.simulator;
};


/**
 * Gets the owning user of the entity, if any.
 * @return {gf.net.User} Owning user.
 */
gf.sim.ServerEntity.prototype.getOwner = function() {
  return this.owner_;
};


/**
 * Sets the owning user of the entity, if any.
 * @param {gf.net.User} value New owning user.
 */
gf.sim.ServerEntity.prototype.setOwner = function(value) {
  this.owner_ = value;
};


/**
 * @override
 */
gf.sim.ServerEntity.prototype.executeCommand = function(command) {
};


/**
 * @override
 */
gf.sim.ServerEntity.prototype.update = function(time, timeDelta) {
};


/**
 * @override
 */
gf.sim.ServerEntity.prototype.postTickUpdate = function(frame) {
};
