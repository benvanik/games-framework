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

goog.provide('gf.audio.Listener');

goog.require('goog.Disposable');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');



/**
 * Audio listener used to position the listener in 3D space.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {AudioContext} context Audio context.
 */
gf.audio.Listener = function(context) {
  goog.base(this);

  /**
   * Target audio context, if it exists.
   * @type {AudioContext}
   */
  this.context = context;
};
goog.inherits(gf.audio.Listener, goog.Disposable);


/**
 * Updates the 3D properties of the listener with the given viewport.
 * @param {goog.vec.Mat4.Type=} opt_inverseViewMatrix Inverse view matrix from
 *     the current viewport. If none is provided the listener will be reset to
 *     the origin.
 */
gf.audio.Listener.prototype.update = function(opt_inverseViewMatrix) {
  if (!this.context) {
    return;
  }
  var listener = this.context.listener;

  if (opt_inverseViewMatrix) {
    var vm = opt_inverseViewMatrix;
    var v0 = gf.audio.Listener.tmpVec3_[0];
    var v1 = gf.audio.Listener.tmpVec3_[1];

    // Position
    goog.vec.Vec3.setFromValues(v0, 0, 0, 0);
    goog.vec.Mat4.multVec3(vm, v0, v0);
    listener.setPosition(v0[0], v0[1], v0[2]);

    // Orientation - get the front and up vectors
    goog.vec.Vec3.setFromValues(v0, 0, 0, 1);
    goog.vec.Mat4.multVec3NoTranslate(vm, v0, v0);
    goog.vec.Vec3.setFromValues(v1, 0, 1, 0);
    goog.vec.Mat4.multVec3NoTranslate(vm, v1, v1);
    listener.setOrientation(
        -v0[0], -v0[1], -v0[2],
        v1[0], v1[1], v1[2]);

    // TODO(benvanik): set listener velocity
    listener.setVelocity(0, 0, 0);
  } else {
    listener.setPosition(0, 0, 0);
    listener.setOrientation(0, 0, 1, 0, 1, 0);
    listener.setVelocity(0, 0, 0);
  }
};


/**
 * Temporary Vec3's.
 * @private
 * @type {!Array.<!goog.vec.Vec3.Type>}
 */
gf.audio.Listener.tmpVec3_ = [
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32()
];
