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

goog.provide('gf.mdl.Instance');

goog.require('gf.vec.Mat4');
goog.require('goog.vec.Mat4');



/**
 * An instance of a model in the world.
 * Instances are the dynamic representations of the shared static model.
 * A model of a sheep will remain the same (with the same animation keyframe
 * data, same vertices, etc) and then instances will represent the sheep in
 * various states (walking, etc).
 *
 * @constructor
 * @param {!gf.mdl.Model} model Model this instance represents.
 */
gf.mdl.Instance = function(model) {
  /**
   * Model this instance represents.
   * @type {!gf.mdl.Model}
   */
  this.model = model;

  var bones = model.getBones();
  /**
   * All bone transformation matrices, packed tightly and in order.
   * @private
   * @type {!Float32Array}
   */
  this.boneTransforms_ = new Float32Array(bones.length * 16);

  /**
   * Absolute bone transformation matrices.
   * This is calculated from {@see #boneTransforms_} as required.
   * @private
   * @type {!Float32Array}
   */
  this.absoluteBoneTransforms_ = new Float32Array(bones.length * 16);

  /**
   * Signals that the bone transforms have changed and the transformation
   * matrices need to be updated.
   * @private
   * @type {boolean}
   */
  this.transformsDirty_ = true;

  // TODO(benvanik): animation state
  // TODO(benvanik): material overrides? colors? etc

  this.reset();
};


/**
 * Resets the instance to its initial state.
 */
gf.mdl.Instance.prototype.reset = function() {
  this.transformsDirty_ = true;

  // Reset all bone transforms to their original values
  var bones = this.model.getBones();
  for (var n = 0, offset = 0; n < bones.length; n++, offset += 16) {
    var bone = bones[n];
    for (var i = 0; i < 16; i++) {
      this.boneTransforms_[offset + i] = bone.transform[i];
    }
  }

  // TODO(benvanik): animation state/etc
};


/**
 * Calculates the absolute bone transforms.
 */
gf.mdl.Instance.prototype.calculateAbsoluteTransforms = function() {
  var transforms = this.boneTransforms_;
  var result = this.absoluteBoneTransforms_;
  var bones = this.model.getBones();

  // Bone 0 is always root, so quick copy that
  goog.vec.Mat4.setFromArray(result, transforms);

  // Process all child bones
  for (var n = 1, offset = 16; n < bones.length; n++, offset += 16) {
    gf.vec.Mat4.multMatOffset(
        transforms, offset,
        result, bones[n].parent.index * 1,
        result, offset);
  }

  this.transformsDirty_ = false;
};


// TODO(benvanik): animation control (layering/etc)
// TODO(benvanik): animation execution (update with time/timeDelta)
// TODO(benvanik): instant seek/set support (for resetting animations in time)
