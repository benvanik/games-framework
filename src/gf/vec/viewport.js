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

goog.provide('gf.vec.Viewport');

goog.require('gf.vec.Containment');
goog.require('gf.vec.Ray');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');
goog.require('goog.vec.Vec4');



/**
 * Viewport utility.
 *
 * @constructor
 */
gf.vec.Viewport = function() {
  /**
   * Viewport width, in px.
   * @type {number}
   */
  this.width = 100;

  /**
   * Viewport height, in px.
   * @type {number}
   */
  this.height = 100;

  /**
   * Distance to the near clipping plane.
   * @type {number}
   */
  this.near = 0.1;

  /**
   * Distance to the far clipping plane.
   * @type {number}
   */
  this.far = 100;

  /**
   * Orthographic projection matrix, useful for 2D.
   * @type {!goog.vec.Mat4.Type}
   */
  this.orthoMatrix = goog.vec.Mat4.createFloat32Identity();

  /**
   * Projection matrix.
   * @type {!goog.vec.Mat4.Type}
   */
  this.projMatrix = goog.vec.Mat4.createFloat32Identity();

  /**
   * View matrix.
   * @type {!goog.vec.Mat4.Type}
   */
  this.viewMatrix = goog.vec.Mat4.createFloat32Identity();

  /**
   * Inverse view matrix.
   * @type {!goog.vec.Mat4.Type}
   */
  this.inverseViewMatrix = goog.vec.Mat4.createFloat32Identity();

  /**
   * Projection x View matrix.
   * @type {!goog.vec.Mat4.Type}
   */
  this.viewProjMatrix = goog.vec.Mat4.createFloat32Identity();

  /**
   * Inverse viewProj for fast ray casting.
   * @type {!goog.vec.Mat4.Type}
   */
  this.inverseViewProjMatrix = goog.vec.Mat4.createFloat32Identity();

  /**
   * Calculated world position.
   * @type {!goog.vec.Vec3.Type}
   */
  this.position = goog.vec.Vec3.createFloat32();

  /**
   * View normal.
   * @type {!goog.vec.Vec3.Type}
   */
  this.direction = goog.vec.Vec3.createFloat32();

  /**
   * 6 planes representing the view frustum.
   * @private
   * @type {!Array.<!goog.vec.Vec4.Type>}
   */
  this.frustumPlanes_ = [
    goog.vec.Vec4.createFloat32(), // L
    goog.vec.Vec4.createFloat32(), // R
    goog.vec.Vec4.createFloat32(), // T
    goog.vec.Vec4.createFloat32(), // B
    goog.vec.Vec4.createFloat32(), // N
    goog.vec.Vec4.createFloat32()  // F
  ];
};


/**
 * Frustum plane index values.
 * @private
 * @enum {number}
 */
gf.vec.Viewport.FrustumPlane_ = {
  LEFT: 0,
  RIGHT: 1,
  TOP: 2,
  BOTTOM: 3,
  NEAR: 4,
  FAR: 5
};


/**
 * Resets the viewport before processing a frame.
 * @param {!goog.math.Size} size New viewport size, in px.
 */
gf.vec.Viewport.prototype.reset = function(size) {
  if (this.width != size.width || this.height != size.height) {
    this.width = size.width;
    this.height = size.height;

    var x = 2 / this.width;
    var y = 2 / -this.height;
    goog.vec.Mat4.setFromValues(this.orthoMatrix,
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, 1, 0,
        -1, 1, 0, 1);

    var fovy = Math.PI / 4;
    var aspect = this.width / this.height;
    goog.vec.Mat4.makePerspective(
        this.projMatrix,
        fovy, aspect,
        this.near, this.far);

    goog.vec.Mat4.multMat(
        this.projMatrix,
        this.viewMatrix,
        this.viewProjMatrix);
    goog.vec.Mat4.invert(this.viewProjMatrix, this.inverseViewProjMatrix);
  }
};


/**
 * Calculates all dependent values, assuming only the projection and view
 * matrices are up to date.
 */
gf.vec.Viewport.prototype.calculate = function() {
  // Update matrices
  goog.vec.Mat4.multMat(this.projMatrix, this.viewMatrix, this.viewProjMatrix);
  goog.vec.Mat4.invert(this.viewMatrix, this.inverseViewMatrix);
  goog.vec.Mat4.invert(this.viewProjMatrix, this.inverseViewProjMatrix);

  // Calculate view frustum planes
  var vpm = this.viewProjMatrix;
  var planes = this.frustumPlanes_;
  goog.vec.Vec4.setFromValues(planes[gf.vec.Viewport.FrustumPlane_.LEFT],
      vpm[3] + vpm[0], vpm[7] + vpm[4], vpm[11] + vpm[8], vpm[15] + vpm[12]);
  goog.vec.Vec4.setFromValues(planes[gf.vec.Viewport.FrustumPlane_.RIGHT],
      vpm[3] - vpm[0], vpm[7] - vpm[4], vpm[11] - vpm[8], vpm[15] - vpm[12]);
  goog.vec.Vec4.setFromValues(planes[gf.vec.Viewport.FrustumPlane_.TOP],
      vpm[3] - vpm[1], vpm[7] - vpm[5], vpm[11] - vpm[9], vpm[15] - vpm[13]);
  goog.vec.Vec4.setFromValues(planes[gf.vec.Viewport.FrustumPlane_.BOTTOM],
      vpm[3] + vpm[1], vpm[7] + vpm[5], vpm[11] + vpm[9], vpm[15] + vpm[13]);
  goog.vec.Vec4.setFromValues(planes[gf.vec.Viewport.FrustumPlane_.NEAR],
      vpm[3] + vpm[2], vpm[7] + vpm[6], vpm[11] + vpm[10], vpm[15] + vpm[14]);
  goog.vec.Vec4.setFromValues(planes[gf.vec.Viewport.FrustumPlane_.FAR],
      vpm[3] - vpm[2], vpm[7] - vpm[6], vpm[11] - vpm[10], vpm[15] - vpm[14]);

  // Normalize all planes
  for (var n = 0; n < planes.length; n++) {
    var plane = planes[n];
    var ilen = 1 / Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] +
        plane[2] * plane[2]);
    plane[0] *= ilen;
    plane[1] *= ilen;
    plane[2] *= ilen;
    plane[3] *= ilen;
  }

  // Determine position
  goog.vec.Vec3.setFromValues(this.position, 0, 0, 0);
  goog.vec.Mat4.multVec3(this.inverseViewMatrix, this.position, this.position);

  // Determine direction
  var x = (0.5 / this.width) * 2 - 1;
  var y = 1 - (0.5 / this.height) * 2;
  var tmpVec3 = gf.vec.Viewport.tmpVec3_;
  var start = tmpVec3[0];
  var end = tmpVec3[1];
  goog.vec.Vec3.setFromValues(start, x, y, -1);
  goog.vec.Vec3.setFromValues(end, x, y, 1);
  goog.vec.Mat4.multVec3Projective(this.inverseViewProjMatrix, start, start);
  goog.vec.Mat4.multVec3Projective(this.inverseViewProjMatrix, end, end);
  goog.vec.Vec3.direction(start, end, this.direction);
  goog.vec.Vec3.negate(this.direction, this.direction);
};


/**
 * Determines whether the given point is contained within the viewport frustum.
 * @param {!goog.vec.Vec3.Type} point Point to test.
 * @return {boolean} True if the point is within the frustum.
 */
gf.vec.Viewport.prototype.containsPoint = function(point) {
  var planes = this.frustumPlanes_;
  for (var n = 0; n < planes.length; n++) {
    var plane = planes[n];
    // Inlined
    //if (this.classifyPoint_(planes[n], point) == -1) {
    var d = plane[0] * point[0] + plane[1] * point[1] + plane[2] * point[2] +
        plane[3];
    if (d < 0) {
      return false;
    }
  }
  return true;
};


/**
 * Determines whether the given bounding sphere is contained within the viewport
 * frustum.
 * @param {!goog.vec.Vec4.Type} sphere Sphere, as XYZR.
 * @return {gf.vec.Containment} Containment of the given bounding box.
 */
gf.vec.Viewport.prototype.containsBoundingSphere = function(sphere) {
  var planes = this.frustumPlanes_;
  for (var n = 0; n < planes.length; n++) {
    var plane = planes[n];
    var d = plane[0] * sphere[0] + plane[1] * sphere[1] + plane[2] * sphere[2] +
        plane[3];
    if (d < -sphere[3]) {
      return gf.vec.Containment.OUTSIDE;
    } else if (Math.abs(d) < sphere[3]) {
      return gf.vec.Containment.PARTIAL;
    }
  }
  return gf.vec.Containment.INSIDE;
};


/**
 * Determines whether the given bounding box is contained within the viewport
 * frustum.
 * @param {!gf.vec.BoundingBox} aabb Axis-aligned bounding box.
 * @return {gf.vec.Containment} Containment of the given bounding box.
 */
gf.vec.Viewport.prototype.containsBoundingBox = function(aabb) {
  var tmpVec = gf.vec.Viewport.tmpVec3_;

  // 8 points on the bounding box
  var min = aabb.min;
  var max = aabb.max;
  goog.vec.Vec3.setFromArray(tmpVec[0], min);
  goog.vec.Vec3.setFromValues(tmpVec[1], min[0], min[1], max[2]);
  goog.vec.Vec3.setFromValues(tmpVec[2], min[0], max[1], min[2]);
  goog.vec.Vec3.setFromValues(tmpVec[3], min[0], max[1], max[2]);
  goog.vec.Vec3.setFromValues(tmpVec[4], max[0], min[1], min[2]);
  goog.vec.Vec3.setFromValues(tmpVec[5], max[0], min[1], max[2]);
  goog.vec.Vec3.setFromValues(tmpVec[6], max[0], max[1], min[2]);
  goog.vec.Vec3.setFromArray(tmpVec[7], max);

  var inTotal = 0;
  var planes = this.frustumPlanes_;
  for (var n = 0; n < planes.length; n++) {
    var plane = planes[n];
    var inCount = 8;
    var pointIn = 1;
    for (var m = 0; m < 8; m++) {
      // Inlined
      //if (this.classifyPoint_(planes[n], tmpVec[m]) == -1) {
      var point = tmpVec[m];
      var d = plane[0] * point[0] + plane[1] * point[1] + plane[2] * point[2] +
          plane[3];
      if (d < 0) {
        pointIn = 0;
        inCount--;
      }
    }
    if (!inCount) {
      return gf.vec.Containment.OUTSIDE;
    }
    inTotal += pointIn;
  }
  return inTotal == 6 ?
      gf.vec.Containment.INSIDE :
      gf.vec.Containment.PARTIAL;
};


/**
 * Gets a ray with its origin at the given screen coordinates pointing in the
 * direction of the viewport.
 * @param {number} screenX Screen position X, in px.
 * @param {number} screenY Screen position Y, in px.
 * @return {!gf.vec.Ray.Type} ray cast from the given coordinates.
 */
gf.vec.Viewport.prototype.getRay = function(screenX, screenY) {
  // Window to NDC
  var x = (screenX / this.width) * 2 - 1;
  var y = 1 - (screenY / this.height) * 2;

  // Unproject two opposing vectors
  var tmpVec3 = gf.vec.Viewport.tmpVec3_;
  var start = tmpVec3[0];
  var end = tmpVec3[1];
  goog.vec.Vec3.setFromValues(start, x, y, -1);
  goog.vec.Vec3.setFromValues(end, x, y, 1);
  goog.vec.Mat4.multVec3Projective(this.inverseViewProjMatrix, start, start);
  goog.vec.Mat4.multVec3Projective(this.inverseViewProjMatrix, end, end);

  // Find direction
  goog.vec.Vec3.direction(start, end, end);

  return gf.vec.Ray.createFromValues(
      start[0], start[1], start[2],
      end[0], end[1], end[2]);
};


/**
 * Makes the given matrix a billboard matrix.
 * @param {!goog.vec.Mat4.Type} mat Matrix to populate.
 * @return {!goog.vec.Mat4.Type} mat for chaining.
 */
gf.vec.Viewport.prototype.makeBillboard = function(mat) {
  // Billboard matrices are inverse view matrices, which are
  // special orthogonal matrices that make inversion really easy - just
  // transpose!
  var vm = this.viewMatrix;
  goog.vec.Mat4.setFromValues(mat,
      vm[0], vm[4], vm[8], 0,
      vm[1], vm[5], vm[9], 0,
      vm[2], vm[6], vm[10], 0,
      0, 0, 0, 1);
  return mat;
};


/**
 * Temporary Vec3's.
 * @private
 * @type {!Array.<!goog.vec.Vec3.Type>}
 */
gf.vec.Viewport.tmpVec3_ = [
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32()
];
