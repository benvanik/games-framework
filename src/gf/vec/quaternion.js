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

goog.provide('gf.vec.Quaternion');


/**
 * @fileoverview Adds some missing methods to the {@see goog.vec.Quaternion}
 * type. These really should be moved into there, but are here until I feel like
 * writing unit tests.
 *
 * TODO(benvanik): move these helpers into Closure
 */


/**
 * Sets the given quaternion to a value representing the Euler angles using
 * the ZYX convention (commonly referred to as yaw-pitch-roll).
 *
 * @param {!goog.vec.Quaternion.AnyType} quat The quaternion.
 * @param {number} theta1 The angle of rotation around the Z axis in radians
 *     (also known as yaw).
 * @param {number} theta2 The angle of rotation around the Y axis in radians
 *     (also known as pitch).
 * @param {number} theta3 The angle of rotation around the Z axis in radians
 *     (also known as roll).
 * @return {!goog.vec.Quaternion.AnyType} Return quat so that operations
 *    can be chained.
 */
gf.vec.Quaternion.makeEulerZYX = function(quat, theta1, theta2, theta3) {
  var s1 = Math.sin(theta1 / 2.0);
  var c1 = Math.cos(theta1 / 2.0);
  var s2 = Math.sin(theta2 / 2.0);
  var c2 = Math.cos(theta2 / 2.0);
  var s3 = Math.sin(theta3 / 2.0);
  var c3 = Math.cos(theta3 / 2.0);
  quat[0] = (c1 * s2) * c3 + (s1 * c2) * s3;
  quat[1] = (s1 * c2) * c3 - (c1 * s2) * s3;
  quat[2] = (c1 * c2) * s3 - (s1 * s2) * c3;
  quat[3] = (c1 * c2) * c3 + (s1 * s2) * s3;
  return /** @type {!goog.vec.Quaternion.AnyType} */ (quat);
};


/**
 * Transforms the given vector with the given quaternion storing the resulting
 * transformed vector into resultVec.
 *
 * @param {!goog.vec.ArrayType} quat The source quaternion.
 * @param {!goog.vec.Vec3.Vec3Like} vec The 3 element vector to transform.
 * @param {!goog.vec.Vec3.Vec3Like} resultVec The 3 element vector to
 *     receive the results (may be vec).
 * @return {!goog.vec.Vec3.Vec3Like} Return resultVec so that operations can be
 *     chained together.
 */
gf.vec.Quaternion.multVec3 = function(quat, vec, resultVec) {
  var xxx = quat[0] * (quat[0] + quat[0]);
  var wxx = quat[3] * (quat[0] + quat[0]);
  var xyy = quat[0] * (quat[1] + quat[1]);
  var yyy = quat[1] * (quat[1] + quat[1]);
  var wyy = quat[3] * (quat[1] + quat[1]);
  var xzz = quat[0] * (quat[2] + quat[2]);
  var yzz = quat[1] * (quat[2] + quat[2]);
  var zzz = quat[2] * (quat[2] + quat[2]);
  var wzz = quat[3] * (quat[2] + quat[2]);
  var x = vec[0], y = vec[1], z = vec[2];
  resultVec[0] =
      ((x * ((1 - yyy) - zzz)) + (y * (xyy - wzz))) + (z * (xzz + wyy));
  resultVec[1] =
      ((x * (xyy + wzz)) + (y * ((1 - xxx) - zzz))) + (z * (yzz - wxx));
  resultVec[2] =
      ((x * (xzz - wyy)) + (y * (yzz + wxx))) + (z * ((1 - xxx) - yyy));
  return resultVec;
};
