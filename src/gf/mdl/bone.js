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

goog.provide('gf.mdl.Bone');

goog.require('gf.vec.BoundingBox');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec4');



/**
 * A bone in a model.
 * Bones control the position of vertices by multiplying their flattened
 * transformation matrices by the vertex position scaled by a bone weight.
 * Vertices can define which bones effect them and by how much.
 *
 * @constructor
 */
gf.mdl.Bone = function() {
  /**
   * Bone name.
   * Optional; can be used to lookup bones by name for attaching.
   * @type {string?}
   */
  this.name = null;

  /**
   * Index in the model bone list.
   * Used when looking up bones or transforming.
   * @type {number}
   */
  this.index = 0;

  /**
   * Parent bone, if any.
   * @type {gf.mdl.Bone}
   */
  this.parent = null;

  /**
   * Child bones.
   * @type {!Array.<!gf.mdl.Bone>}
   */
  this.children = [];

  /**
   * Transform, relative to parent.
   * @type {!goog.vec.Mat4.Float32}
   */
  this.transform = goog.vec.Mat4.createFloat32Identity();

  /**
   * Axis-aligned bounding box.
   * @type {!gf.vec.BoundingBox}
   */
  this.boundingBox = gf.vec.BoundingBox.create();

  /**
   * Bounding sphere.
   * @type {!goog.vec.Vec4.Float32}
   */
  this.boundingSphere = goog.vec.Vec4.createFloat32();

  // TODO(benvanik): hit test mesh
  // TODO(benvanik): collision mesh
};
