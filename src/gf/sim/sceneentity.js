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

goog.provide('gf.sim.SceneEntity');

goog.require('gf.sim.Entity');
goog.require('gf.sim.SpatialEntity');



/**
 * Abstract entity that contains entites.
 * An entity that contains entities that may be spatially orientied, supplying
 * utilities useful for them.
 *
 * @constructor
 * @extends {gf.sim.Entity}
 * @param {!gf.sim.Simulator} simulator Owning simulator.
 * @param {!gf.sim.EntityFactory} entityFactory Entity factory.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag} values.
 * @param {!gf.sim.search.SpatialDatabase} spatialDatabase Spatial database.
 */
gf.sim.SceneEntity = function(
    simulator, entityFactory, entityId, entityFlags, spatialDatabase) {
  goog.base(this, simulator, entityFactory, entityId, entityFlags);

  /**
   * Spatial lookup database.
   * Children are added to this to enable fast lookups.
   * @private
   * @type {!gf.sim.search.SpatialDatabase}
   */
  this.spatialDatabase_ = spatialDatabase;
};
goog.inherits(gf.sim.SceneEntity, gf.sim.Entity);


/**
 * Gets the spatial database used for spatial queries.
 * @return {!gf.sim.search.SpatialDatabase} Spatial database.
 */
gf.sim.SceneEntity.prototype.getSpatialDatabase = function() {
  return this.spatialDatabase_;
};


/**
 * @override
 */
gf.sim.SceneEntity.prototype.childAdded = function(entity) {
  if (entity instanceof gf.sim.SpatialEntity) {
    this.spatialDatabase_.addEntity(entity);
  }
};


/**
 * @override
 */
gf.sim.SceneEntity.prototype.childRemoved = function(entity) {
  if (entity instanceof gf.sim.SpatialEntity) {
    this.spatialDatabase_.removeEntity(entity);
  }
};


/**
 * Handles child spatial entities getting their transforms changed.
 * @param {!gf.sim.SpatialEntity} entity Entity that changed.
 */
gf.sim.SceneEntity.prototype.childTransformed = function(entity) {
  this.spatialDatabase_.updateEntity(entity);
};
