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

goog.provide('gf.sim.entities.SpatialEntity');

goog.require('gf.log');
goog.require('gf.sim.Entity');
goog.require('gf.sim.EntityState');
goog.require('gf.sim.Variable');
goog.require('gf.sim.VariableFlag');
goog.require('gf.sim.entities.SceneEntity');
goog.require('gf.vec.Mat4');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Quaternion');
goog.require('goog.vec.Vec3');
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
gf.sim.entities.SpatialEntity = function(
    simulator, entityFactory, entityId, entityFlags) {
  goog.base(this, simulator, entityFactory, entityId, entityFlags);

  /**
   * Ancestor scene entity, if it exists.
   * @private
   * @type {gf.sim.entities.SceneEntity}
   */
  this.scene_ = null;

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
goog.inherits(gf.sim.entities.SpatialEntity, gf.sim.Entity);


/**
 * @override
 */
gf.sim.entities.SpatialEntity.prototype.parentChanged = function(
    oldParent, newParent) {
  goog.base(this, 'parentChanged', oldParent, newParent);

  // Search up the new chain
  this.scene_ = null;
  var ancestor = newParent;
  while (ancestor) {
    if (ancestor instanceof gf.sim.entities.SceneEntity) {
      this.scene_ = ancestor;
      break;
    }
    ancestor = ancestor.getParent();
  }
};


/**
 * Gets the ancestor scene entity, if any.
 * @return {gf.sim.entities.SceneEntity} Scene entity.
 */
gf.sim.entities.SpatialEntity.prototype.getScene = function() {
  return this.scene_;
};


/**
 * @override
 */
gf.sim.entities.SpatialEntity.prototype.postNetworkUpdate = function() {
  this.transformDirty_ = true;
};


/**
 * Invalidates the transformation/bounding sphere so that they are updated next
 * access.
 */
gf.sim.entities.SpatialEntity.prototype.invalidateTransform = function() {
  this.transformDirty_ = true;
};


/**
 * Updates the transform and bounding sphere, if required.
 */
gf.sim.entities.SpatialEntity.prototype.updateTransform = function() {
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
  goog.vec.Quaternion.toRotationMatrix4(
      state.rotation, transform);
  gf.vec.Mat4.multScalePost(
      transform, scale[0], scale[1], scale[2], transform);
  gf.vec.Mat4.multTranslationPre(
      position[0], position[1], position[2], transform, transform);

  if (this.scene_) {
    this.scene_.childTransformed(this);
  }
};


/**
 * Gets the bounding sphere of the entity.
 * The value is written into the given 4-float vector as XYZR.
 * @param {!goog.vec.Vec4.Float32} result Result XYZR sphere.
 * @return {!goog.vec.Vec4.Float32} Result, returned for chaining.
 */
gf.sim.entities.SpatialEntity.prototype.getBoundingSphere = function(result) {
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
gf.sim.entities.SpatialEntity.prototype.getTransform = function(
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
    if (current instanceof gf.sim.entities.SpatialEntity) {
      goog.vec.Mat4.multMat(current.transform_, result, result);
    }
    current = this.getParent();
  }
  return result;
};



/**
 * Spatial entity state.
 * @constructor
 * @extends {gf.sim.EntityState}
 * @param {!gf.sim.Entity} entity Entity that this object stores state for.
 * @param {!gf.sim.VariableTable} variableTable A subclass's variable table.
 */
gf.sim.entities.SpatialEntity.State = function(entity, variableTable) {
  goog.base(this, entity, variableTable);

  /**
   * Position in the world in 3-space.
   * @private
   * @type {!goog.vec.Vec3.Float32}
   */
  this.position_ = goog.vec.Vec3.createFloat32();

  /**
   * @private
   * @type {number}
   */
  this.positionOrdinal_ = variableTable.getOrdinal(
      gf.sim.entities.SpatialEntity.State.positionTag_);

  /**
   * Rotation quaternion.
   * @private
   * @type {!goog.vec.Quaternion.Float32}
   */
  this.rotation_ = goog.vec.Quaternion.createFloat32();

  /**
   * @private
   * @type {number}
   */
  this.rotationOrdinal_ = variableTable.getOrdinal(
      gf.sim.entities.SpatialEntity.State.rotationTag_);

  /**
   * Scaling vector.
   * @private
   * @type {!goog.vec.Vec3.Float32}
   */
  this.scale_ = goog.vec.Vec3.createFloat32();

  /**
   * @private
   * @type {number}
   */
  this.scaleOrdinal_ = variableTable.getOrdinal(
      gf.sim.entities.SpatialEntity.State.scaleTag_);

  /**
   * Bounding radius.
   * Used as the radius in a bounding sphere centered at the current position.
   * @private
   * @type {!goog.vec.Quaternion.Float32}
   */
  this.boundingRadius_ = 0;

  /**
   * @private
   * @type {number}
   */
  this.boundingRadiusOrdinal_ = variableTable.getOrdinal(
      gf.sim.entities.SpatialEntity.State.boundingRadiusTag_);
};
goog.inherits(gf.sim.entities.SpatialEntity.State, gf.sim.EntityState);


/**
 * @private
 * @type {number}
 */
gf.sim.entities.SpatialEntity.State.positionTag_ =
    gf.sim.Variable.getUniqueTag();


/**
 * @private
 * @type {number}
 */
gf.sim.entities.SpatialEntity.State.rotationTag_ =
    gf.sim.Variable.getUniqueTag();


/**
 * @private
 * @type {number}
 */
gf.sim.entities.SpatialEntity.State.scaleTag_ =
    gf.sim.Variable.getUniqueTag();


/**
 * @private
 * @type {number}
 */
gf.sim.entities.SpatialEntity.State.boundingRadiusTag_ =
    gf.sim.Variable.getUniqueTag();


/**
 * Gets the entity position.
 * @return {!goog.vec.Vec3.Float32} Current value.
 */
gf.sim.entities.SpatialEntity.State.prototype.getPosition = function() {
  return this.position_;
};


/**
 * Sets the entity position.
 * @param {goog.vec.Vec3.Float32} value New value.
 */
gf.sim.entities.SpatialEntity.State.prototype.setPosition = function(value) {
  gf.log.write('setPosition:', value[0], value[1], value[2]);
  if (!goog.vec.Vec3.equals(this.position_, value)) {
    goog.vec.Vec3.setFromArray(this.position_, value);
    this.setVariableDirty(this.positionOrdinal_);
    this.entity.invalidateTransform();
  }
};


/**
 * Gets the entity rotation.
 * @return {!goog.vec.Quaternion.Float32} Current value.
 */
gf.sim.entities.SpatialEntity.State.prototype.getRotation = function() {
  return this.rotation_;
};


/**
 * Sets the entity rotation.
 * @param {goog.vec.Quaternion.Float32} value New value.
 */
gf.sim.entities.SpatialEntity.State.prototype.setRotation = function(value) {
  gf.log.write('setRotation:', value[0], value[1], value[2], value[3]);
  if (!goog.vec.Vec4.equals(this.rotation_, value)) {
    goog.vec.Quaternion.setFromArray(this.rotation_, value);
    this.setVariableDirty(this.rotationOrdinal_);
    this.entity.invalidateTransform();
  }
};


/**
 * Gets the entity scale.
 * @return {!goog.vec.Vec3.Float32} Current value.
 */
gf.sim.entities.SpatialEntity.State.prototype.getScale = function() {
  return this.scale_;
};


/**
 * Sets the entity scale.
 * @param {goog.vec.Vec3.Float32} value New value.
 */
gf.sim.entities.SpatialEntity.State.prototype.setScale = function(value) {
  if (!goog.vec.Vec3.equals(this.scale_, value)) {
    goog.vec.Vec3.setFromArray(this.scale_, value);
    this.setVariableDirty(this.scaleOrdinal_);
    this.entity.invalidateTransform();
  }
};


/**
 * Gets the bounding radius.
 * @return {number} Current value.
 */
gf.sim.entities.SpatialEntity.State.prototype.getBoundingRadius = function() {
  return this.boundingRadius_;
};


/**
 * Sets the bounding radius.
 * @param {number} value New value.
 */
gf.sim.entities.SpatialEntity.State.prototype.setBoundingRadius =
    function(value) {
  if (!this.boundingRadius_ != value) {
    this.boundingRadius_ = value;
    this.setVariableDirty(this.boundingRadiusOrdinal_);
    this.entity.invalidateTransform();
  }
};


/**
 * @override
 */
gf.sim.entities.SpatialEntity.State.declareVariables = function(variableList) {
  gf.sim.EntityState.declareVariables(variableList);
  variableList.push(new gf.sim.Variable.Vec3(
      gf.sim.entities.SpatialEntity.State.positionTag_,
      gf.sim.VariableFlag.UPDATED_FREQUENTLY | gf.sim.VariableFlag.INTERPOLATED,
      gf.sim.entities.SpatialEntity.State.prototype.getPosition,
      gf.sim.entities.SpatialEntity.State.prototype.setPosition));
  variableList.push(new gf.sim.Variable.Quaternion(
      gf.sim.entities.SpatialEntity.State.rotationTag_,
      gf.sim.VariableFlag.UPDATED_FREQUENTLY | gf.sim.VariableFlag.INTERPOLATED,
      gf.sim.entities.SpatialEntity.State.prototype.getRotation,
      gf.sim.entities.SpatialEntity.State.prototype.setRotation,
      true));
  variableList.push(new gf.sim.Variable.Vec3(
      gf.sim.entities.SpatialEntity.State.scaleTag_,
      gf.sim.VariableFlag.UPDATED_FREQUENTLY | gf.sim.VariableFlag.INTERPOLATED,
      gf.sim.entities.SpatialEntity.State.prototype.getScale,
      gf.sim.entities.SpatialEntity.State.prototype.setScale));
  variableList.push(new gf.sim.Variable.Float(
      gf.sim.entities.SpatialEntity.State.boundingRadiusTag_,
      gf.sim.VariableFlag.UPDATED_FREQUENTLY | gf.sim.VariableFlag.INTERPOLATED,
      gf.sim.entities.SpatialEntity.State.prototype.getBoundingRadius,
      gf.sim.entities.SpatialEntity.State.prototype.setBoundingRadius));
};
