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

goog.provide('gf.vec.Ray');
goog.provide('gf.vec.Ray.RayLike');
goog.provide('gf.vec.Ray.Type');

goog.require('goog.vec.Vec3');


/**
 * @fileoverview {@see goog.vec.Ray} has some weird design decisions.
 * Because none of the other goog.vec types use it, I'm reimplementing it here
 * so that it's useful. It'd be nice to get this into Closure.
 *
 * Rays here are 6 element Float32Arrays, basically two vec3's mashed together
 * representing origin and direction. This is to prevent allocations, match the
 * semantics of the other goog.vec types, and maybe even speed things up.
 */


/**
 * Type used when an argument can be either an array of numbers or a
 * typed float32 array. This allows using the class on normal js arrays too.
 * @typedef {goog.vec.ArrayType}
 */
gf.vec.Ray.RayLike;


/**
 * @typedef {Float32Array}
 */
gf.vec.Ray.Type;


/**
 * Creates a ray initialized to zero.
 *
 * @return {!gf.vec.Ray.Type} The new ray.
 */
gf.vec.Ray.create = function() {
  return new Float32Array(6);
};


/**
 * Creates a new ray initialized with the value from the given array.
 *
 * @param {gf.vec.Ray.RayLike} ray The source ray array.
 * @return {!gf.vec.Ray.Type} The new ray.
 */
gf.vec.Ray.createFromArray = function(ray) {
  var newRay = gf.vec.Ray.create();
  gf.vec.Ray.setFromArray(newRay, ray);
  return newRay;
};


/**
 * Creates a new ray initialized with the supplied values.
 *
 * @param {number} originX Origin point X.
 * @param {number} originY Origin point Y.
 * @param {number} originZ Origin point Z.
 * @param {number} dirX Direction vector X.
 * @param {number} dirY Direction vector Y.
 * @param {number} dirZ Direction vector Z.
 * @return {!gf.vec.Ray.Type} The new ray.
 */
gf.vec.Ray.createFromValues = function(
    originX, originY, originZ, dirX, dirY, dirZ) {
  var ray = gf.vec.Ray.create();
  gf.vec.Ray.setFromValues(ray, originX, originY, originZ, dirX, dirY, dirZ);
  return ray;
};


/**
 * Creates a clone of the given ray.
 *
 * @param {gf.vec.Ray.RayLike} ray The source ray.
 * @return {!gf.vec.Ray.Type} The new cloned ray.
 */
gf.vec.Ray.clone = gf.vec.Ray.createFromArray;


/**
 * Initializes the ray with the given values.
 *
 * @param {gf.vec.Ray.RayLike} ray The ray to receive the values.
 * @param {number} originX Origin point X.
 * @param {number} originY Origin point Y.
 * @param {number} originZ Origin point Z.
 * @param {number} dirX Direction vector X.
 * @param {number} dirY Direction vector Y.
 * @param {number} dirZ Direction vector Z.
 */
gf.vec.Ray.setFromValues = function(ray,
    originX, originY, originZ, dirX, dirY, dirZ) {
  ray[0] = originX;
  ray[1] = originY;
  ray[2] = originZ;
  ray[3] = dirX;
  ray[4] = dirY;
  ray[5] = dirZ;
};


/**
 * Initializes the ray with the given array of values.
 *
 * @param {gf.vec.Ray.RayLike} ray The ray to receive the values.
 * @param {gf.vec.Ray.RayLike} values The array of values.
 */
gf.vec.Ray.setFromArray = function(ray, values) {
  ray[0] = values[0];
  ray[1] = values[1];
  ray[2] = values[2];
  ray[3] = values[3];
  ray[4] = values[4];
  ray[5] = values[5];
};


/**
 * Sets the origin of the ray to the given point.
 *
 * @param {gf.vec.Ray.RayLike} ray The ray to receive the values.
 * @param {number} originX Origin point X.
 * @param {number} originY Origin point Y.
 * @param {number} originZ Origin point Z.
 */
gf.vec.Ray.setOriginFromValues = function(ray, originX, originY, originZ) {
  ray[0] = originX;
  ray[1] = originY;
  ray[2] = originZ;
};


/**
 * Sets the origin of the ray to the given point.
 *
 * @param {gf.vec.Ray.RayLike} ray The ray to receive the values.
 * @param {goog.vec.Vec3.Vec3Like} vec Origin point.
 */
gf.vec.Ray.setOriginFromArray = function(ray, vec) {
  ray[0] = vec[0];
  ray[1] = vec[1];
  ray[2] = vec[2];
};


/**
 * Sets the direction of the ray to the given vector.
 *
 * @param {gf.vec.Ray.RayLike} ray The ray to receive the values.
 * @param {number} dirX Direction vector X.
 * @param {number} dirY Direction vector Y.
 * @param {number} dirZ Direction vector Z.
 */
gf.vec.Ray.setDirectionFromValues = function(ray, dirX, dirY, dirZ) {
  ray[3] = dirX;
  ray[4] = dirY;
  ray[5] = dirZ;
};


/**
 * Sets the direction of the ray to the given vector.
 *
 * @param {gf.vec.Ray.RayLike} ray The ray to receive the values.
 * @param {goog.vec.Vec3.Vec3Like} vec Direction vector.
 */
gf.vec.Ray.setDirectionFromArray = function(ray, vec) {
  ray[3] = vec[0];
  ray[4] = vec[1];
  ray[5] = vec[2];
};


/**
 * Returns true if the components of r0 are equal to the components of v1.
 *
 * @param {gf.vec.Ray.RayLike} r0 The first ray.
 * @param {gf.vec.Ray.RayLike} r1 The second ray.
 * @return {boolean} True if the rays are equal, false otherwise.
 */
gf.vec.Ray.equals = function(r0, r1) {
  return r0.length == r1.length &&
      r0[0] == r1[0] && r0[1] == r1[1] && r0[2] == r1[2] &&
      r0[3] == r1[3] && r0[4] == r1[4] && r0[5] == r1[5];
};


/**
 * Tests whether the ray intersects the given sphere.
 *
 * @param {gf.vec.Ray.RayLike} ray Ray.
 * @param {goog.vec.Vec4.Vec4Like} sphere Sphere, stored as [x,y,z,r].
 * @return {boolean} True if the ray intersects the sphere.
 */
gf.vec.Ray.intersectsSphere = function(ray, sphere) {
  var w = goog.vec.Vec3.subtract(sphere, ray, gf.vec.Ray.tmpVec3_[0]);
  // dot(w, w)
  var wsq = w[0] * w[0] + w[1] * w[1] + w[2] * w[2];
  // dot(w, ray.direction)
  var proj = w[0] * ray[3] + w[1] * ray[4] + w[2] * ray[5];
  var rsq = sphere[3] * sphere[3];

  // If the sphere is behind the ray, no intersection
  if (proj < 0 && wsq > rsq) {
    return false;
  }

  // dot(ray.direction, ray.direction)
  var vsq = ray[3] * ray[3] + ray[4] * ray[4] + ray[5] * ray[5];

  // Test length difference vs. radius
  return vsq * wsq - proj * proj <= vsq * rsq;
};


/**
 * @type {!Array.<!goog.vec.Vec3.Float32>}
 * @private
 */
gf.vec.Ray.tmpVec3_ = [
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32()
];
