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

goog.provide('gf.sim.SpatialEntity');

goog.require('gf.sim.Entity');
goog.require('gf.vec.Mat4');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Quaternion');
goog.require('goog.vec.Vec4');



/**
 * Abstract spatial entity.
 * An entity that exists in a scene and has a position/rotation.
 *
 * @constructor
 * @extends {gf.sim.Entity}
 * @param {!gf.sim.Simulator} simulator Owning simulator.
 * @param {!gf.sim.EntityFactory} entityFactory Entity factory.
 * @param {number} entityId Entity ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag} values.
 */
gf.sim.SpatialEntity = function(
    simulator, entityFactory, entityId, entityFlags) {
  goog.base(this, simulator, entityFactory, entityId, entityFlags);

  /**
   * Dirty flag signaling that the transform is dirty and must be regenerated.
   * @private
   * @type {boolean}
   */
  this.transformDirty_ = true;

  /**
   * A bounding sphere centered at the position of the entity with a radius
   * defined by the max scale axis and the given bounding radius.
   * @private
   * @type {!goog.vec.Vec4.Float32}
   */
  this.boundingSphere_ = goog.vec.Vec4.createFloat32();

  /**
   * Cached entity transform.
   * This matrix is generated from the state (position/rotation/scale)
   * each time it is updated.
   * @private
   * @type {!goog.vec.Mat4.Float32}
   */
  this.transform_ = goog.vec.Mat4.createFloat32();
};
goog.inherits(gf.sim.SpatialEntity, gf.sim.Entity);


/**
 * @override
 */
gf.sim.SpatialEntity.prototype.postNetworkUpdate = function() {
  goog.base(this, 'postNetworkUpdate');

  this.transformDirty_ = true;
};


/**
 * Invalidates the transformation/bounding sphere so that they are updated next
 * access.
 */
gf.sim.SpatialEntity.prototype.invalidateTransform = function() {
  this.transformDirty_ = true;
};


/**
 * Updates the transform and bounding sphere, if required.
 */
gf.sim.SpatialEntity.prototype.updateTransform = function() {
  if (!this.transformDirty_) {
    return;
  }
  this.transformDirty_ = false;

  var state = this.getState();
  var position = state.getPosition();
  var rotation = state.getRotation();
  var scale = state.getScale();

  // Bounding sphere
  this.boundingSphere_[0] = position[0];
  this.boundingSphere_[1] = position[1];
  this.boundingSphere_[2] = position[2];
  this.boundingSphere_[3] = state.getBoundingRadius() *
      Math.max(scale[0], Math.max(scale[1], scale[2]));

  // Transform
  var transform = this.transform_;
  goog.vec.Quaternion.toRotationMatrix4(rotation, transform);
  gf.vec.Mat4.multScalePost(
      transform, scale[0], scale[1], scale[2], transform);
  gf.vec.Mat4.multTranslationPre(
      position[0], position[1], position[2], transform, transform);

  // Notify parent scene that this transform changed
  // TODO(benvanik): something cleaner, perhaps an interface
  var parent = this.getParent();
  if (parent && parent.childTransformed) {
    parent.childTransformed(this);
  }
};


/**
 * Gets the bounding sphere of the entity.
 * The value is written into the given 4-float vector as XYZR.
 * @param {!goog.vec.Vec4.Float32} result Result XYZR sphere.
 * @return {!goog.vec.Vec4.Float32} Result, returned for chaining.
 */
gf.sim.SpatialEntity.prototype.getBoundingSphere = function(result) {
  if (this.transformDirty_) {
    this.updateTransform();
  }
  goog.vec.Vec4.setFromArray(result, this.boundingSphere_);
  return result;
};


/**
 * Calculates a transformation matrix from this entity up to the root (or a
 * given parent entity).
 * @param {!goog.vec.Mat4.Float32} result Matrix to populate with the transform.
 * @param {gf.sim.Entity=} opt_relativeToParent Parent entity to get the
 *     transform to. If omitted then the transform is relative to the root.
 * @return {!goog.vec.Mat4.Float32} The result matrix, for chaining.
 */
gf.sim.SpatialEntity.prototype.getTransform = function(
    result, opt_relativeToParent) {
  if (this.transformDirty_) {
    this.updateTransform();
  }

  // TODO(benvanik): cache this (at least to null?)

  // Get current transform
  goog.vec.Mat4.setFromArray(result, this.transform_);

  // Walk up the tree until the given parent or root
  var untilParent = opt_relativeToParent || null;
  var current = this.getParent();
  while (current != untilParent) {
    // If this ancestor is a spatial entity apply its transform
    if (current instanceof gf.sim.SpatialEntity) {
      goog.vec.Mat4.multMat(current.transform_, result, result);
    }
    current = this.getParent();
  }
  return result;
};


/**
 * Calculates a viewport from the entities perspective.
 * @param {!gf.vec.Viewport} viewport Viewport to fill with the results.
 */
gf.sim.SpatialEntity.prototype.calculateViewport = function(viewport) {
  var state = /** @type {!gf.sim.SpatialEntityState} */ (this.getState());

  // Set matrix based on state
  var vm = viewport.viewMatrix;
  var position = state.getPosition();
  var rotation = state.getRotation();
  // TODO(benvanik): does scale matter?
  goog.vec.Quaternion.toRotationMatrix4(rotation, vm);
  goog.vec.Mat4.transpose(vm, vm);
  goog.vec.Mat4.translate(vm,
      -position[0], -position[1], -position[2]);

  // Update viewport matrices/etc now that the controller logic has been applied
  viewport.calculate();
};
