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
 * @fileoverview Octree supporting common operations used when using them for
 * collision detection, picking, and rendering. Supports automatic growth such
 * that no initial size need be given.
 *
 * TODO(benvanik): move into closure?
 *
 * TODO(benvanik): better intersection algorithm that walks the ray in a sorted
 *     manner to prevent having to build the list
 * TODO(benvanik): potentially cache value bb/coord on Node to prevent extra
 *     indirection on checks
 */


goog.provide('gf.vec.Octree');
goog.provide('gf.vec.Octree.ValueCallback');

goog.require('gf.vec.BoundingBox');
goog.require('gf.vec.Containment');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.vec.Vec3');



/**
 * Octree structure.
 *
 * TODO(benvanik): linked value list for fast forEach enum?
 *
 * @constructor
 * @param {number=} opt_minSize Minimum size of a node, in units.
 * @param {number=} opt_maxCoord Maximum coordinate that will be seen in any
 *     direction.
 */
gf.vec.Octree = function(opt_minSize, opt_maxCoord) {
  /**
   * Minimum size of a node, in units.
   * Do not change this value once the tree has been initialized.
   * @type {number}
   */
  this.minSize = opt_minSize || 1;

  /**
   * Maximum coordinate that will be seen in any direction.
   * @type {number}
   */
  this.maxCoord = opt_maxCoord || gf.vec.Octree.MAX_COORD_;

  /**
   * Total value count.
   * @type {number}
   */
  this.count = 0;

  /**
   * Root node.
   * @type {!gf.vec.Octree.Node}
   */
  this.root = new gf.vec.Octree.Node(null,
      -this.maxCoord,
      -this.maxCoord,
      -this.maxCoord,
      this.maxCoord * 2);
};


/**
 * Maximum valid coordinate (in either direction).
 * @private
 * @const
 * @type {number}
 */
gf.vec.Octree.MAX_COORD_ = Math.pow(2, 10);


/**
 * Adds the given value to the tree.
 * @param {!gf.vec.Octree.Value} value Value to add.
 */
gf.vec.Octree.prototype.add = function(value) {
  goog.asserts.assert(!value.node);

  // Find the node that should contain this value
  var parentNode = this.root.find(value.coord, false);

  // If node has a value already, split, refind node, repeat until we have a
  // leaf we can go into
  while (parentNode.value) {
    goog.asserts.assert(parentNode.size / 2 >= this.minSize);
    parentNode.split();
    parentNode = parentNode.find(value.coord, false);
  }
  goog.asserts.assert(!parentNode.value);

  // Wire up
  parentNode.value = value;
  value.node = parentNode;

  // Update total count
  while (parentNode) {
    parentNode.totalValueCount++;
    parentNode = parentNode.parent;
  }

  this.count++;
};


/**
 * Removes the given value from the tree.
 * @param {!gf.vec.Octree.Value} value Value to remove.
 */
gf.vec.Octree.prototype.remove = function(value) {
  var node = value.node;
  goog.asserts.assert(node);
  value.node = null;
  node.value = null;
  goog.asserts.assert(node.totalValueCount == 1);
  node.totalValueCount = 0;

  // Update total count
  var parentNode = node.parent;
  while (parentNode) {
    parentNode.totalValueCount--;
    if (parentNode.totalValueCount <= 1) {
      parentNode.merge();
    }
    parentNode = parentNode.parent;
  }

  this.count--;
};


/**
 * Removes all values from the tree.
 */
gf.vec.Octree.prototype.removeAll = function() {
  this.count = 0;
  this.root = new gf.vec.Octree.Node(null,
      -this.maxCoord,
      -this.maxCoord,
      -this.maxCoord,
      this.maxCoord * 2);
};


/**
 * Finds the value containing the given coordinate.
 * @param {!goog.vec.Vec3.Float32} coord Coordinate to search.
 * @return {gf.vec.Octree.Value} Containing value, if found.
 */
gf.vec.Octree.prototype.find = function(coord) {
  var node = this.root.find(coord, true);
  var value = node.value;
  if (value) {
    // Ensure the value contains the coordinate
    if (gf.vec.BoundingBox.contains(value.boundingBox, coord)) {
      return value;
    }
  }
  return null;
};


/**
 * Enumerates all of the values in the tree.
 * @param {!gf.vec.Octree.ValueCallback} fn Callback function.
 * @param {Object=} opt_obj Scope for the callback function.
 */
gf.vec.Octree.prototype.forEach = function(fn, opt_obj) {
  this.root.forEach(fn, opt_obj);
};


/**
 * Enumerates all of the values in the tree inside of the given bounding box.
 * @param {!gf.vec.BoundingBox} aabb Axis-aligned bounding box.
 * @param {!gf.vec.Octree.ValueCallback} fn Callback function.
 * @param {Object=} opt_obj Scope for the callback function.
 */
gf.vec.Octree.prototype.forEachInBoundingBox = function(aabb, fn, opt_obj) {
  if (this.root.totalValueCount) {
    this.root.forEachInBoundingBox(false, aabb, fn, opt_obj);
  }
};


/**
 * Enumerates all of the values in the tree inside the given view frustum.
 * @param {!gf.vec.Viewport} viewport Viewport to cull against.
 * @param {!gf.vec.Octree.ValueCallback} fn Callback function.
 * @param {Object=} opt_obj Scope for the callback function.
 */
gf.vec.Octree.prototype.forEachInViewport = function(viewport, fn, opt_obj) {
  if (this.root.totalValueCount) {
    this.root.forEachInViewport(false, viewport, fn, opt_obj);
  }
};


/**
 * Enumerates all of the values intersected by the given ray.
 * @param {!gf.vec.Ray.Type} ray Ray to cast.
 * @param {number} maxDistance Maximum search distance.
 * @param {!gf.vec.Octree.ValueCallback} fn Callback function.
 * @param {Object=} opt_obj Scope for the callback function.
 */
gf.vec.Octree.prototype.forEachIntersecting = function(ray, maxDistance,
    fn, opt_obj) {
  // NOTE: if we started doing an actual ordered traversal then it would make
  // more sense to have this be the primary fn instead of intersect, as it
  // would enable early exit/etc

  // Gather all results (sorted)
  var resultList = this.intersect(ray, maxDistance);

  // Issue callbacks
  for (var n = 0; n < resultList.length; n++) {
    if (fn.call(opt_obj, resultList[n],
        /** @type {!gf.vec.Octree.Node} */ (resultList[n].node)) === false) {
      break;
    }
  }
};


/**
 * Casts a ray through the tree and returns all values it intersects.
 * Optionally sorts the values by the distance from the ray origin.
 * @param {!gf.vec.Ray.Type} ray Ray to cast.
 * @param {number=} opt_maxDistance Maximum search distance.
 * @return {!Array.<!gf.vec.Octree.Value>} All intersected values, if any.
 */
gf.vec.Octree.prototype.intersect = function(ray, opt_maxDistance) {
  var maxDistance = goog.isDef(opt_maxDistance) ?
      opt_maxDistance : Number.MAX_VALUE;

  // TODO(benvanik): rewrite this algorithm:
  // http://chiranjivi.tripod.com/octrav.html
  // If we had an algorithm that marged from ray origin through the tree, it'd
  // be possible to actually do a proper enumeration
  // TODO(benvanik): investigage marching rays

  // Early exit - means we will never have to deal with totally empty nodes
  // in the traversal
  if (!this.root.totalValueCount) {
    return [];
  }

  // Distance is distance squared
  var maxDistanceSq = maxDistance * maxDistance;

  // All results stored in this list should be in distance order
  /** @type {!Array.<!gf.vec.Octree.Value>} */
  var resultList = [];

  // Traverse and fill the result list
  this.root.findIntersections(ray, maxDistanceSq, resultList);

  return resultList;
};


/**
 * Temporary vec3s for math.
 * @private
 * @type {!Array.<!goog.vec.Vec3.Float32>}
 */
gf.vec.Octree.tmpVec3_ = [
  goog.vec.Vec3.createFloat32(),
  goog.vec.Vec3.createFloat32()
];



/**
 * Node in an octree.
 * Can contain other nodes or be a leaf containing user data.
 *
 * @constructor
 * @param {gf.vec.Octree.Node} parent Parent node, if any.
 * @param {number} x Position of the node X, in units.
 * @param {number} y Position of the node Y, in units.
 * @param {number} z Position of the node Z, in units.
 * @param {number} size Size of the node, in units.
 */
gf.vec.Octree.Node = function(parent, x, y, z, size) {
  /**
   * Parent node, if not root.
   * @type {gf.vec.Octree.Node}
   */
  this.parent = parent;

  /**
   * @type {number}
   */
  this.x = x;

  /**
   * @type {number}
   */
  this.y = y;

  /**
   * @type {number}
   */
  this.z = z;

  /**
   * @type {number}
   */
  this.size = size;

  /**
   * Axis-aligned bounding box for the node.
   * @type {!gf.vec.BoundingBox}
   */
  this.boundingBox = gf.vec.BoundingBox.createFromValues(
      x, y, z, x + size, y + size, z + size);

  /**
   * Whether this node has children
   * @type {boolean}
   */
  this.hasChildren = false;

  /** @type {gf.vec.Octree.Node} */
  this.child_nxnynz = null;
  /** @type {gf.vec.Octree.Node} */
  this.child_pxnynz = null;
  /** @type {gf.vec.Octree.Node} */
  this.child_nxpynz = null;
  /** @type {gf.vec.Octree.Node} */
  this.child_pxpynz = null;
  /** @type {gf.vec.Octree.Node} */
  this.child_nxnypz = null;
  /** @type {gf.vec.Octree.Node} */
  this.child_pxnypz = null;
  /** @type {gf.vec.Octree.Node} */
  this.child_nxpypz = null;
  /** @type {gf.vec.Octree.Node} */
  this.child_pxpypz = null;

  /**
   * Total number of values contained within this node, including itself.
   * @type {number}
   */
  this.totalValueCount = 0;

  /**
   * User-defined value, if the node is a leaf.
   * @type {gf.vec.Octree.Value}
   */
  this.value = null;
};


/**
 * Finds the smallest node that contains the given coordinate.
 * Note that the result node may be a leaf.
 * @param {!goog.vec.Vec3.Float32} coord Coordinate.
 * @param {boolean} search True if the find is a search (vs. a mutate).
 * @return {!gf.vec.Octree.Node} The smallest node that contains the given
 *     coordinate.
 */
gf.vec.Octree.Node.prototype.find = function(coord, search) {
  goog.asserts.assert(gf.vec.BoundingBox.contains(this.boundingBox, coord));
  if (this.hasChildren) {
    // Check children
    // TODO(benvanik): may be faster just to walk the array...
    var halfSize = this.size / 2;
    if (coord[0] < this.x + halfSize) {
      // -X
      if (coord[1] < this.y + halfSize) {
        // -Y
        if (coord[2] < this.z + halfSize) {
          // -X, -Y, -Z
          if (!this.child_nxnynz) {
            if (!search) {
              this.child_nxnynz = new gf.vec.Octree.Node(this,
                  this.x, this.y, this.z, halfSize);
            } else {
              return this;
            }
          }
          return this.child_nxnynz.find(coord, search);
        } else {
          // -X, -Y, +Z
          if (!this.child_nxnypz) {
            if (!search) {
              this.child_nxnypz = new gf.vec.Octree.Node(this,
                  this.x, this.y, this.z + halfSize, halfSize);
            } else {
              return this;
            }
          }
          return this.child_nxnypz.find(coord, search);
        }
      } else {
        // +Y
        if (coord[2] < this.z + halfSize) {
          // -X, +Y, -Z
          if (!this.child_nxpynz) {
            if (!search) {
              this.child_nxpynz = new gf.vec.Octree.Node(this,
                  this.x, this.y + halfSize, this.z, halfSize);
            } else {
              return this;
            }
          }
          return this.child_nxpynz.find(coord, search);
        } else {
          // -X, +Y, +Z
          if (!this.child_nxpypz) {
            if (!search) {
              this.child_nxpypz = new gf.vec.Octree.Node(this,
                  this.x, this.y + halfSize, this.z + halfSize, halfSize);
            } else {
              return this;
            }
          }
          return this.child_nxpypz.find(coord, search);
        }
      }
    } else {
      // +X
      if (coord[1] < this.y + halfSize) {
        // -Y
        if (coord[2] < this.z + halfSize) {
          // +X, -Y, -Z
          if (!this.child_pxnynz) {
            if (!search) {
              this.child_pxnynz = new gf.vec.Octree.Node(this,
                  this.x + halfSize, this.y, this.z, halfSize);
            } else {
              return this;
            }
          }
          return this.child_pxnynz.find(coord, search);
        } else {
          // +X, -Y, +Z
          if (!this.child_pxnypz) {
            if (!search) {
              this.child_pxnypz = new gf.vec.Octree.Node(this,
                  this.x + halfSize, this.y, this.z + halfSize, halfSize);
            } else {
              return this;
            }
          }
          return this.child_pxnypz.find(coord, search);
        }
      } else {
        // +Y
        if (coord[2] < this.z + halfSize) {
          // +X, +Y, -Z
          if (!this.child_pxpynz) {
            if (!search) {
              this.child_pxpynz = new gf.vec.Octree.Node(this,
                  this.x + halfSize, this.y + halfSize, this.z, halfSize);
            } else {
              return this;
            }
          }
          return this.child_pxpynz.find(coord, search);
        } else {
          // +X, +Y, +Z
          if (!this.child_pxpypz) {
            if (!search) {
              this.child_pxpypz = new gf.vec.Octree.Node(this,
                  this.x + halfSize, this.y + halfSize, this.z + halfSize,
                  halfSize);
            } else {
              return this;
            }
          }
          return this.child_pxpypz.find(coord, search);
        }
      }
    }
  } else {
    // Leaf node, return
    return this;
  }
};


/**
 * Splits a node.
 * The node must not already be split.
 */
gf.vec.Octree.Node.prototype.split = function() {
  goog.asserts.assert(!this.hasChildren);

  // Split
  this.hasChildren = true;

  // Place the value in the right child
  if (this.value) {
    var child = this.find(this.value.coord, false);
    goog.asserts.assert(!child.totalValueCount);
    child.value = this.value;
    child.value.node = child;
    child.totalValueCount = 1;
    this.value = null;
  }
};


/**
 * Merges a node.
 * The node must already be split, and must have only one child.
 */
gf.vec.Octree.Node.prototype.merge = function() {
  goog.asserts.assert(this.totalValueCount == 1);

  // Find the value
  var value = null;
  if (!value && this.child_nxnynz && this.child_nxnynz.value) {
    value = this.child_nxnynz.value;
  }
  if (!value && this.child_pxnynz && this.child_pxnynz.value) {
    value = this.child_pxnynz.value;
  }
  if (!value && this.child_nxpynz && this.child_nxpynz.value) {
    value = this.child_nxpynz.value;
  }
  if (!value && this.child_pxpynz && this.child_pxpynz.value) {
    value = this.child_pxpynz.value;
  }
  if (!value && this.child_nxnypz && this.child_nxnypz.value) {
    value = this.child_nxnypz.value;
  }
  if (!value && this.child_pxnypz && this.child_pxnypz.value) {
    value = this.child_pxnypz.value;
  }
  if (!value && this.child_nxpypz && this.child_nxpypz.value) {
    value = this.child_nxpypz.value;
  }
  if (!value && this.child_pxpypz && this.child_pxpypz.value) {
    value = this.child_pxpypz.value;
  }

  // Rewrite value references
  value.node = this;
  this.value = value;

  // Drop children
  this.hasChildren = false;
  this.child_nxnynz = null;
  this.child_pxnynz = null;
  this.child_nxpynz = null;
  this.child_pxpynz = null;
  this.child_nxnypz = null;
  this.child_pxnypz = null;
  this.child_nxpypz = null;
  this.child_pxpypz = null;
};


/**
 * Enumerates all of the values in the node.
 * @param {!gf.vec.Octree.ValueCallback} fn Callback function.
 * @param {Object=} opt_obj Scope for the callback function.
 * @return {boolean} False to stop the enumeration.
 */
gf.vec.Octree.Node.prototype.forEach = function(fn, opt_obj) {
  // If this is a leaf, call the callback
  if (this.value) {
    return fn.call(opt_obj, this.value, this) === false ? false : true;
  } else if (this.hasChildren) {
    // Enumerate children
    if (this.child_nxnynz && this.child_nxnynz.forEach(fn, opt_obj) === false) {
      return false;
    }
    if (this.child_pxnynz && this.child_pxnynz.forEach(fn, opt_obj) === false) {
      return false;
    }
    if (this.child_nxpynz && this.child_nxpynz.forEach(fn, opt_obj) === false) {
      return false;
    }
    if (this.child_pxpynz && this.child_pxpynz.forEach(fn, opt_obj) === false) {
      return false;
    }
    if (this.child_nxnypz && this.child_nxnypz.forEach(fn, opt_obj) === false) {
      return false;
    }
    if (this.child_pxnypz && this.child_pxnypz.forEach(fn, opt_obj) === false) {
      return false;
    }
    if (this.child_nxpypz && this.child_nxpypz.forEach(fn, opt_obj) === false) {
      return false;
    }
    if (this.child_pxpypz && this.child_pxpypz.forEach(fn, opt_obj) === false) {
      return false;
    }
  }
  return true;
};


/**
 * Enumerates all of the values in the node inside the given bounding box.
 * @param {boolean} enclosed True if the current node is fully enclosed in the
 *     bounding box.
 * @param {!gf.vec.BoundingBox} aabb Axis-aligned bounding box to cull against.
 * @param {!gf.vec.Octree.ValueCallback} fn Callback function.
 * @param {Object=} opt_obj Scope for the callback function.
 */
gf.vec.Octree.Node.prototype.forEachInBoundingBox = function(enclosed, aabb,
    fn, opt_obj) {
  // See just how far we are inside (if not already known)
  var containment = enclosed ?
      gf.vec.Containment.INSIDE :
      gf.vec.BoundingBox.containsBoundingBox(aabb, this.boundingBox);

  // Early out -- note that it would be nice to avoid this if we could by
  // checking before we get called
  if (containment == gf.vec.Containment.OUTSIDE) {
    return;
  }

  if (this.hasChildren) {
    enclosed = enclosed || containment == gf.vec.Containment.INSIDE;
    if (this.child_nxnynz && this.child_nxnynz.totalValueCount) {
      this.child_nxnynz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
    if (this.child_pxnynz && this.child_pxnynz.totalValueCount) {
      this.child_pxnynz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
    if (this.child_nxpynz && this.child_nxpynz.totalValueCount) {
      this.child_nxpynz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
    if (this.child_pxpynz && this.child_pxpynz.totalValueCount) {
      this.child_pxpynz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
    if (this.child_nxnypz && this.child_nxnypz.totalValueCount) {
      this.child_nxnypz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
    if (this.child_pxnypz && this.child_pxnypz.totalValueCount) {
      this.child_pxnypz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
    if (this.child_nxpypz && this.child_nxpypz.totalValueCount) {
      this.child_nxpypz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
    if (this.child_pxpypz && this.child_pxpypz.totalValueCount) {
      this.child_pxpypz.forEachInBoundingBox(enclosed, aabb, fn, opt_obj);
    }
  } else if (this.value) {
    if (containment == gf.vec.Containment.INSIDE) {
      // All inside, so always call on value
      fn.call(opt_obj, this.value, this);
    } else {
      // Check if value is *really* inside - if so, callback
      containment = gf.vec.BoundingBox.containsBoundingBox(
          aabb, this.value.boundingBox);
      if (containment != gf.vec.Containment.OUTSIDE) {
        fn.call(opt_obj, this.value, this);
      }
    }
  }
};


/**
 * Enumerates all of the values in the node inside the given view frustum.
 * @param {boolean} enclosed True if the current node is fully enclosed in the
 *     frustum.
 * @param {!gf.vec.Viewport} viewport Viewport to cull against.
 * @param {!gf.vec.Octree.ValueCallback} fn Callback function.
 * @param {Object=} opt_obj Scope for the callback function.
 */
gf.vec.Octree.Node.prototype.forEachInViewport = function(enclosed, viewport,
    fn, opt_obj) {
  // See just how far we are inside (if not already known)
  var containment = enclosed ?
      gf.vec.Containment.INSIDE :
      viewport.containsBoundingBox(this.boundingBox);

  // Early out -- note that it would be nice to avoid this if we could by
  // checking before we get called
  if (containment == gf.vec.Containment.OUTSIDE) {
    return;
  }

  if (this.hasChildren) {
    enclosed = enclosed || containment == gf.vec.Containment.INSIDE;
    if (this.child_nxnynz && this.child_nxnynz.totalValueCount) {
      this.child_nxnynz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
    if (this.child_pxnynz && this.child_pxnynz.totalValueCount) {
      this.child_pxnynz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
    if (this.child_nxpynz && this.child_nxpynz.totalValueCount) {
      this.child_nxpynz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
    if (this.child_pxpynz && this.child_pxpynz.totalValueCount) {
      this.child_pxpynz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
    if (this.child_nxnypz && this.child_nxnypz.totalValueCount) {
      this.child_nxnypz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
    if (this.child_pxnypz && this.child_pxnypz.totalValueCount) {
      this.child_pxnypz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
    if (this.child_nxpypz && this.child_nxpypz.totalValueCount) {
      this.child_nxpypz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
    if (this.child_pxpypz && this.child_pxpypz.totalValueCount) {
      this.child_pxpypz.forEachInViewport(enclosed, viewport, fn, opt_obj);
    }
  } else if (this.value) {
    if (containment == gf.vec.Containment.INSIDE) {
      // All inside, so always call on value
      fn.call(opt_obj, this.value, this);
    } else {
      // Check if value is *really* inside - if so, callback
      containment = viewport.containsBoundingBox(this.value.boundingBox);
      if (containment != gf.vec.Containment.OUTSIDE) {
        fn.call(opt_obj, this.value, this);
      }
    }
  }
};


/**
 * Recursive intersection search.
 * @param {!gf.vec.Ray.Type} ray Ray to cast.
 * @param {number} maxDistanceSq Maximum search distance squared.
 * @param {!Array.<!gf.vec.Octree.Value>} resultList Results, sorted by
 *     distance.
 */
gf.vec.Octree.Node.prototype.findIntersections = function(ray, maxDistanceSq,
    resultList) {
  var tmpVec = gf.vec.Octree.tmpVec3_[0];

  // If a leaf, test the bounding box/ray on the value itself (it may be less)
  // than the node
  var value = this.value;
  if (value) {
    if (gf.vec.BoundingBox.intersectsRay(value.boundingBox, ray, tmpVec)) {
      // Intersected! Compute distance
      var distanceSq = goog.vec.Vec3.distanceSquared(ray, tmpVec);
      if (distanceSq <= maxDistanceSq) {
        // Within range - add to list
        value.searchDistanceSq = distanceSq;
        goog.array.binaryInsert(resultList, value,
            gf.vec.Octree.Value.distanceSqComparer);
      }
    }
  } else {
    // Intersect each child against the ray - only go into it if it is a hit
    goog.asserts.assert(this.hasChildren);

    if (this.child_nxnynz && this.child_nxnynz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_nxnynz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_nxnynz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
    if (this.child_pxnynz && this.child_pxnynz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_pxnynz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_pxnynz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
    if (this.child_nxpynz && this.child_nxpynz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_nxpynz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_nxpynz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
    if (this.child_pxpynz && this.child_pxpynz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_pxpynz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_pxpynz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
    if (this.child_nxnypz && this.child_nxnypz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_nxnypz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_nxnypz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
    if (this.child_pxnypz && this.child_pxnypz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_pxnypz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_pxnypz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
    if (this.child_nxpypz && this.child_nxpypz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_nxpypz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_nxpypz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
    if (this.child_pxpypz && this.child_pxpypz.totalValueCount &&
        gf.vec.BoundingBox.intersectsRay(
            this.child_pxpypz.boundingBox, ray, tmpVec)) {
      if (goog.vec.Vec3.distanceSquared(ray, tmpVec) <= maxDistanceSq) {
        // Within range - traverse
        this.child_pxpypz.findIntersections(ray, maxDistanceSq, resultList);
      }
    }
  }
};



/**
 * Octree value interface.
 * All values added to the octree must implement this interface to provide
 * the coordinate data required for processing.
 *
 * @interface
 */
gf.vec.Octree.Value = function() {};


/**
 * Parent octree node.
 * @type {gf.vec.Octree.Node}
 */
gf.vec.Octree.Value.prototype.node;


/**
 * Coordinate used for positioning the value in the octree space.
 * @type {!goog.vec.Vec3.Float32}
 */
gf.vec.Octree.Value.prototype.coord;


/**
 * Axis-aligned bounding box of the value.
 * @type {!gf.vec.BoundingBox}
 */
gf.vec.Octree.Value.prototype.boundingBox;


/**
 * Search distance squared. Don't use.
 * TODO(benvanik): see if possible to remove this value.
 * @type {number}
 */
gf.vec.Octree.Value.prototype.searchDistanceSq;


/**
 * Comparison function that sorts on searchDistanceSq ascending.
 * @param {!gf.vec.Octree.Value} a First value.
 * @param {!gf.vec.Octree.Value} b Second value.
 * @return {number} Sort order.
 */
gf.vec.Octree.Value.distanceSqComparer = function(a, b) {
  return a.searchDistanceSq - b.searchDistanceSq;
};


/**
 * Callback receiving a value and the node that it is in.
 * The result of the callback, if false, will abort the enumeration.
 * @typedef {function(!gf.vec.Octree.Value, !gf.vec.Octree.Node):(
 *     boolean|undefined)}
 */
gf.vec.Octree.ValueCallback;
