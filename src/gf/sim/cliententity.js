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

goog.provide('gf.sim.ClientEntity');

goog.require('gf.sim.Entity');



/**
 * Client-side simulation entity base type.
 *
 * @constructor
 * @extends {gf.sim.Entity}
 * @param {!gf.sim.ClientSimulator} simulator Owning client simulator.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 */
gf.sim.ClientEntity = function(simulator, entityId, entityFlags) {
  goog.base(this, simulator, entityId, entityFlags);
};
goog.inherits(gf.sim.ClientEntity, gf.sim.Entity);


/**
 * Gets the client simulator that owns this entity.
 * @return {!gf.sim.ClientSimulator} Simulator.
 */
gf.sim.ClientEntity.prototype.getSimulator = function() {
  return this.simulator;
};


// TODO(benvanik): command handling


/**
 * @override
 */
gf.sim.ClientEntity.prototype.update = function(time, timeDelta) {
};


/**
 * @override
 */
gf.sim.ClientEntity.prototype.postTickUpdate = function(frame) {
};
