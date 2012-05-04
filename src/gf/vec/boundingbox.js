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

goog.provide('gf.vec.BoundingBox');

goog.require('gf.vec.Containment');
goog.require('goog.vec');
goog.require('goog.vec.Vec3');



/**
 * Axis-aligned bounding box.
 *
 * TODO(benvanik): would be nice to make this like gf.vec.Ray so that we avoid
 * the two extra allocations.
 *
 * @constructor
 * @param {!goog.vec.Vec3.Type} min Minimum point.
 * @param {!goog.vec.Vec3.Type} max Maximum point.
 */
gf.vec.BoundingBox = function(min, max) {
  /**
   * @type {!goog.vec.Vec3.Type}
   */
  this.min = min;

  /**
   * @type {!goog.vec.Vec3.Type}
   */
  this.max = max;
};


/**
 * Creates an AABB with no size.
 * @return {!gf.vec.BoundingBox} A new Aabb.
 */
gf.vec.BoundingBox.create = function() {
  return new gf.vec.BoundingBox(
      goog.vec.Vec3.createFloat32(), goog.vec.Vec3.createFloat32());
};


/**
 * Creates an AABB from the given values.
 * @param {number} minx Minimum X value.
 * @param {number} miny Minimum Y value.
 * @param {number} minz Minimum Z value.
 * @param {number} maxx Maximum X value.
 * @param {number} maxy Maximum Y value.
 * @param {number} maxz Maximum Z value.
 * @return {!gf.vec.BoundingBox} A new Aabb.
 */
gf.vec.BoundingBox.createFromValues = function(
    minx, miny, minz, maxx, maxy, maxz) {
  var aabb = gf.vec.BoundingBox.create();
  aabb.min[0] = minx < maxx ? minx : maxx;
  aabb.min[1] = miny < maxy ? miny : maxy;
  aabb.min[2] = minz < maxz ? minz : maxz;
  aabb.max[0] = minx < maxx ? maxx : minx;
  aabb.max[1] = miny < maxy ? maxy : miny;
  aabb.max[2] = minz < maxz ? maxz : minz;
  return aabb;
};


/**
 * Creates an AABB from the given points list.
 * @param {!Array.<!goog.vec.Vec3.Vec3Like>} points Points.
 * @return {!gf.vec.BoundingBox} A new AABB defined by the given points.
 */
gf.vec.BoundingBox.createFromList = function(points) {
  var aabb = gf.vec.BoundingBox.create();
  gf.vec.BoundingBox.setFromList(aabb, points);
  return aabb;
};


/**
 * Creates an AABB from the given tightly packed points array.
 * @param {!goog.vec.ArrayType} points A list of x,y,z points.
 * @return {!gf.vec.BoundingBox} A new AABB defined by the given points.
 */
gf.vec.BoundingBox.createFromArray = function(points) {
  var aabb = gf.vec.BoundingBox.create();
  gf.vec.BoundingBox.setFromArray(aabb, points);
  return aabb;
};


/**
 * Clones an AABB.
 * @param {!gf.vec.BoundingBox} aabb Source AABB.
 * @return {!gf.vec.BoundingBox} A cloned instance of the given AABB.
 */
gf.vec.BoundingBox.clone = function(aabb) {
  return new gf.vec.BoundingBox(
      goog.vec.Vec3.cloneFloat32(aabb.min),
      goog.vec.Vec3.cloneFloat32(aabb.max));
};


/**
 * Sets an AABB to the value of another AABB.
 * @param {!gf.vec.BoundingBox} aabb AABB to set.
 * @param {!gf.vec.BoundingBox} source Source AABB.
 */
gf.vec.BoundingBox.set = function(aabb, source) {
  goog.vec.Vec3.setFromArray(aabb.min, source.min);
  goog.vec.Vec3.setFromArray(aabb.max, source.max);
};


/**
 * Sets an AABB from the given values.
 * @param {!gf.vec.BoundingBox} aabb The AABB to update.
 * @param {number} minx Minimum X value.
 * @param {number} miny Minimum Y value.
 * @param {number} minz Minimum Z value.
 * @param {number} maxx Maximum X value.
 * @param {number} maxy Maximum Y value.
 * @param {number} maxz Maximum Z value.
 */
gf.vec.BoundingBox.setFromValues = function(
    aabb, minx, miny, minz, maxx, maxy, maxz) {
  goog.vec.Vec3.setFromValues(aabb.min, minx, miny, minz);
  goog.vec.Vec3.setFromValues(aabb.max, maxx, maxy, maxz);
};


/**
 * Sets an AABB from the given points list.
 * @param {!gf.vec.BoundingBox} aabb The AABB to update.
 * @param {!Array.<!goog.vec.Vec3.Vec3Like>} points Points.
 */
gf.vec.BoundingBox.setFromList = function(aabb, points) {
  var min = aabb.min;
  var max = aabb.max;
  if (!points.length) {
    goog.vec.Vec3.setFromValues(min, 0, 0, 0);
    goog.vec.Vec3.setFromValues(max, 0, 0, 0);
    return;
  }
  goog.vec.Vec3.setFromArray(min, points[0]);
  goog.vec.Vec3.setFromArray(max, points[0]);
  for (var n = 1; n < points.length; n++) {
    var point = points[n];
    if (point[0] < min[0]) {
      min[0] = point[0];
    } else if (point[0] > max[0]) {
      max[0] = point[0];
    }
    if (point[1] < min[1]) {
      min[1] = point[1];
    } else if (point[1] > max[1]) {
      max[1] = point[1];
    }
    if (point[2] < min[2]) {
      min[2] = point[2];
    } else if (point[2] > max[2]) {
      max[2] = point[2];
    }
  }
};


/**
 * Sets an AABB from the given tightly packed points array.
 * @param {!gf.vec.BoundingBox} aabb The AABB to update.
 * @param {!goog.vec.ArrayType} points A list of x,y,z points.
 */
gf.vec.BoundingBox.setFromArray = function(aabb, points) {
  var min = aabb.min;
  var max = aabb.max;
  if (!points.length) {
    goog.vec.Vec3.setFromValues(min, 0, 0, 0);
    goog.vec.Vec3.setFromValues(max, 0, 0, 0);
    return;
  }
  var i = 0;
  goog.vec.Vec3.setFromValues(min, points[i], points[i + 1], points[i + 2]);
  goog.vec.Vec3.setFromValues(max, points[i], points[i + 1], points[i + 2]);
  i++;
  for (var n = 1; n < points.length / 3; n++, i++) {
    if (points[i] < min[0]) {
      min[0] = points[i];
    } else if (points[i] > max[0]) {
      max[0] = points[i];
    }
    if (points[i + 1] < min[1]) {
      min[1] = points[i + 1];
    } else if (points[i + 1] > max[1]) {
      max[1] = points[i + 1];
    }
    if (points[i + 2] < min[2]) {
      min[2] = points[i + 2];
    } else if (points[i + 2] > max[2]) {
      max[2] = points[i + 2];
    }
  }
};


/**
 * Gets a point at the center of the AABB.
 * @param {!gf.vec.BoundingBox} aabb AABB.
 * @param {goog.vec.Vec3.Vec3Like} resultVec The vector to receive the result.
 * @return {!goog.vec.Vec3.Vec3Like} return resultVec so that operations can be
 *    chained together.
 */
gf.vec.BoundingBox.getCenter = function(aabb, resultVec) {
  // TODO(benvanik): if this profiles hot it could be cached
  resultVec[0] = (aabb.max[0] - aabb.min[0]) / 2 + aabb.min[0];
  resultVec[1] = (aabb.max[1] - aabb.min[1]) / 2 + aabb.min[1];
  resultVec[2] = (aabb.max[2] - aabb.min[2]) / 2 + aabb.min[2];
  return resultVec;
};


/**
 * Determines whether the given point is contained within the bounding box.
 * @param {!gf.vec.BoundingBox} aabb AABB.
 * @param {!goog.vec.Vec3.Type} vec Point to test.
 * @return {boolean} True if the point is within the AABB.
 */
gf.vec.BoundingBox.contains = function(aabb, vec) {
  var x = vec[0];
  var y = vec[1];
  var z = vec[2];
  if (x >= aabb.min[0] && x < aabb.max[0] &&
      y >= aabb.min[1] && y < aabb.max[1] &&
      z >= aabb.min[2] && z < aabb.max[2]) {
    return true;
  }
  return false;
};


/**
 * Determines whether two bounding boxes intersect.
 * @param {!gf.vec.BoundingBox} a First AABB.
 * @param {!gf.vec.BoundingBox} b Second AABB.
 * @return {gf.vec.Containment} Bounding boxes containment.
 */
gf.vec.BoundingBox.containsBoundingBox = function(a, b) {
  var amin = a.min;
  var amax = a.max;
  var bmin = b.min;
  var bmax = b.max;
  if (amax[0] < bmin[0] || amin[0] > bmax[0] ||
      amax[1] < bmin[1] || amin[1] > bmax[1] ||
      amax[2] < bmin[2] || amin[2] > bmax[2]) {
    return gf.vec.Containment.OUTSIDE;
  }
  if (amin[0] > bmin[0] || bmax[0] > amax[0] ||
      amin[1] > bmin[1] || bmax[1] > amax[1] ||
      amin[2] > bmin[2] || bmax[2] > amax[2]) {
    return gf.vec.Containment.PARTIAL;
  }
  return gf.vec.Containment.INSIDE;
};


/**
 * Determines whether an AABB is intersected by a ray and returns the entry and
 * exit points.
 * @param {!gf.vec.BoundingBox} aabb AABB to test.
 * @param {!gf.vec.Ray.RayLike} ray Ray to cast.
 * @param {goog.vec.Vec3.Vec3Like=} opt_enter Entry point, if an interesection
 *     occurred. May be the ray origin if it started inside of the box.
 * @param {goog.vec.Vec3.Vec3Like=} opt_exit Exit point, if an intersection
 *     occurred.
 * @return {boolean} True if the AABB is intersected by the ray.
 */
gf.vec.BoundingBox.intersectsRay = function(aabb, ray, opt_enter, opt_exit) {
  // This method is largely from OGRE, as I can't think good

  var min = aabb.min;
  var max = aabb.max;

  var absDir = gf.vec.BoundingBox.tmpVec3_[0];
  absDir[0] = Math.abs(ray[3]);
  absDir[1] = Math.abs(ray[4]);
  absDir[2] = Math.abs(ray[5]);

  // Sort the axis, ensure check minimise floating error axis first
  var imax = 0, imid = 1, imin = 2;
  if (absDir[0] < absDir[2]) {
    imax = 2;
    imin = 0;
  }
  if (absDir[1] < absDir[imin]) {
    imid = imin;
    imin = 1;
  }
  else if (absDir[1] > absDir[imax]) {
    imid = imax;
    imax = 1;
  }

  // Check each axis in turn
  var start = 0;
  var end = Number.MAX_VALUE;

  var dir = ray[3 + imax];
  var newStart = (min[imax] - ray[imax]) / dir;
  var newEnd = (max[imax] - ray[imax]) / dir;
  if (newStart > newEnd) {
    var tmp = newStart;
    newStart = newEnd;
    newEnd = tmp;
  }
  if (newStart > end || newEnd < start) {
    return false;
  }
  if (newStart > start) {
    start = newStart;
  }
  if (newEnd < end) {
    end = newEnd;
  }

  if (absDir[imid] < goog.vec.EPSILON) {
    // Parallel with middle and minimise axis, check bounds only
    if (ray[imid] < min[imid] || ray[imid] > max[imid] ||
        ray[imin] < min[imin] || ray[imin] > max[imin]) {
      return false;
    }
  } else {
    dir = ray[3 + imid];
    newStart = (min[imid] - ray[imid]) / dir;
    newEnd = (max[imid] - ray[imid]) / dir;
    if (newStart > newEnd) {
      var tmp = newStart;
      newStart = newEnd;
      newEnd = tmp;
    }
    if (newStart > end || newEnd < start) {
      return false;
    }
    if (newStart > start) {
      start = newStart;
    }
    if (newEnd < end) {
      end = newEnd;
    }

    if (absDir[imin] < goog.vec.EPSILON) {
      // Parallel with minimise axis, check bounds only
      if (ray[imin] < min[imin] || ray[imin] > max[imin]) {
        return false;
      }
    } else {
      dir = ray[3 + imin];
      newStart = (min[imin] - ray[imin]) / dir;
      newEnd = (max[imin] - ray[imin]) / dir;
      if (newStart > newEnd) {
        var tmp = newStart;
        newStart = newEnd;
        newEnd = tmp;
      }
      if (newStart > end || newEnd < start) {
        return false;
      }
      if (newStart > start) {
        start = newStart;
      }
      if (newEnd < end) {
        end = newEnd;
      }
    }
  }

  if (opt_enter) {
    opt_enter[0] = ray[0] + ray[3] * start;
    opt_enter[1] = ray[1] + ray[4] * start;
    opt_enter[2] = ray[2] + ray[5] * start;
  }
  if (opt_exit) {
    opt_exit[0] = ray[0] + ray[3] * end;
    opt_exit[1] = ray[1] + ray[4] * end;
    opt_exit[2] = ray[2] + ray[5] * end;
  }

  return true;
};


/**
 * Temporary vec3s for math.
 * @private
 * @type {!Array.<!goog.vec.Vec3.Type>}
 */
gf.vec.BoundingBox.tmpVec3_ = [
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32()
];
