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

goog.provide('gf.sim.search.ListDatabase');

goog.require('gf.sim.SpatialEntity');
goog.require('gf.sim.search.SpatialDatabase');
goog.require('goog.array');
goog.require('goog.vec.Vec4');



/**
 * Degenerate list-based spatial search database.
 *
 * @constructor
 * @extends {gf.sim.search.SpatialDatabase}
 */
gf.sim.search.ListDatabase = function() {
  goog.base(this);

  /**
   * List of entities in the database.
   * @private
   * @type {!Array.<!gf.sim.SpatialEntity>}
   */
  this.entities_ = [];
};
goog.inherits(gf.sim.search.ListDatabase, gf.sim.search.SpatialDatabase);


/**
 * @override
 */
gf.sim.search.ListDatabase.prototype.addEntity = function(entity) {
  this.entities_.push(entity);
};


/**
 * @override
 */
gf.sim.search.ListDatabase.prototype.updateEntity = function(entity) {
};


/**
 * @override
 */
gf.sim.search.ListDatabase.prototype.removeEntity = function(entity) {
  goog.array.remove(this.entities_, entity);
};


/**
 * @override
 */
gf.sim.search.ListDatabase.prototype.forEach = function(callback, opt_scope) {
  for (var n = 0; n < this.entities_.length; n++) {
    if (callback.call(opt_scope || goog.global, this.entities_[n]) === false) {
      break;
    }
  }
};


/**
 * @override
 */
gf.sim.search.ListDatabase.prototype.forEachInViewport = function(
    viewport, callback, opt_scope) {
  for (var n = 0; n < this.entities_.length; n++) {
    var entity = this.entities_[n];
    // TODO(benvanik): test viewport
    var distance = 0;
    if (callback.call(opt_scope || goog.global, this.entities_[n], distance) ===
        false) {
      break;
    }
  }
};


/**
 * @override
 */
gf.sim.search.ListDatabase.prototype.forEachIntersecting = function(
    entityOrSphere, callback, opt_scope) {
  var sphere = gf.sim.search.ListDatabase.tmpVec4_;
  if (entityOrSphere instanceof gf.sim.SpatialEntity) {
    entityOrSphere.getBoundingSphere(sphere);
  } else {
    sphere = /** @type {!goog.vec.Vec4.Float32} */ (entityOrSphere);
  }
  for (var n = 0; n < this.entities_.length; n++) {
    var entity = this.entities_[n];
    // TODO(benvanik): test sphere-sphere
    if (callback.call(opt_scope || goog.global, this.entities_[n]) === false) {
      break;
    }
  }
};


/**
 * @override
 */
gf.sim.search.ListDatabase.prototype.nextTraceHit = function(trace) {
  // TODO(benvanik): some kind of tracing
  return false;
};


/**
 * Scratch Vec4.
 * @private
 * @type {!goog.vec.Vec4.Float32}
 */
gf.sim.search.ListDatabase.tmpVec4_ = goog.vec.Vec4.createFloat32();
