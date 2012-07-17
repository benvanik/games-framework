/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
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

goog.provide('gf.sim.Variable');
goog.provide('gf.sim.VariableFlag');

goog.require('goog.math');
goog.require('goog.vec.Quaternion');
goog.require('goog.vec.Vec3');



/**
 * Abstract base variable type.
 * Along with its subclasses describes information about a varaible that is used
 * to build fast network lookup and serialization/deserialization tables.
 *
 * Variables must be declared identically both on the client and the server
 * and cannot vary between the two based on state/options/etc.
 *
 * @constructor
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 */
gf.sim.Variable = function(flags) {
  /**
   * Ordinal in the variable table.
   * This is populated by the {@see gf.sim.VariableTable} upon creation.
   * @type {number}
   */
  this.ordinal = 0;

  /**
   * Bitmask of {@see gf.sim.VariableFlag} values describing the behavior of
   * the variable.
   * @type {number}
   */
  this.flags = flags;
};


/**
 * Deep clones the variable.
 * @return {!gf.sim.Variable} A cloned instance.
 */
gf.sim.Variable.prototype.clone = goog.abstractMethod;


/**
 * Reads the variable.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.Variable.prototype.read = goog.abstractMethod;


/**
 * Writes the variable.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.Variable.prototype.write = goog.abstractMethod;


/**
 * Copies the value from one object to another.
 * @param {!Object} source Source object.
 * @param {!Object} target Target object.
 */
gf.sim.Variable.prototype.copy = goog.abstractMethod;


/**
 * Interpolates the value between the given two states.
 * @param {!Object} source Interpolation source object.
 * @param {!Object} target Interpolation target object.
 * @param {number} t Interpolation coefficient, [0-1].
 * @param {!Object} result Storage object.
 */
gf.sim.Variable.prototype.interpolate = goog.abstractMethod;


/**
 * Stable sort comparison function for priority.
 * Requires that ordinal be set to the array order.
 * @param {!gf.sim.Variable} a Variable.
 * @param {!gf.sim.Variable} b Variable.
 * @return {number} Comparison <0, 0, >0.
 */
gf.sim.Variable.sortByPriority = function(a, b) {
  var frequentA = a.flags & gf.sim.VariableFlag.UPDATED_FREQUENTLY;
  var frequentB = b.flags & gf.sim.VariableFlag.UPDATED_FREQUENTLY;
  return (frequentB - frequentA) || (a.ordinal - b.ordinal);
};


/**
 * Bitmask values describing the behavior of variables.
 * @enum {number}
 */
gf.sim.VariableFlag = {
  /**
   * Variable is never replicated.
   * Values that exist on both client and server but can be inferred on the
   * client should set this bit.
   * Examples: sky color (inferred from weather).
   */
  NOT_REPLICATED: 1 << 0,

  /**
   * Variable will update frequently (perhaps every tick) and should get
   * optimized placement in the lookup table.
   * Examples: actor position.
   */
  UPDATED_FREQUENTLY: 1 << 1,

  /**
   * Variable is predicted on the client.
   * Signals that the variable will be modified during the prediction process.
   * Entities must also have prediction enabled on them.
   * Examples: local player position.
   */
  PREDICTED: 1 << 2,

  /**
   * Variable is interpolated on the client.
   * Any variable that must be interpolated between server sync updates can
   * set this bit.
   * Examples: remote/AI actor position, animation state.
   */
  INTERPOLATED: 1 << 3
};



/**
 * Variable containing a floating-point number.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():number} getter Prototype function that gets the value.
 * @param {!function(number)} setter Prototype function that sets the value.
 */
gf.sim.Variable.Float = function(flags, getter, setter) {
  goog.base(this, flags);

  /**
   * @private
   * @type {!function():number}
   */
  this.getter_ = getter;

  /**
   * @private
   * @type {!function(number)}
   */
  this.setter_ = setter;
};
goog.inherits(gf.sim.Variable.Float, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.Float.prototype.clone = function() {
  return new gf.sim.Variable.Float(this.flags, this.getter_, this.setter_);
};


/**
 * @override
 */
gf.sim.Variable.Float.prototype.read = function(target, reader) {
  this.setter_.call(target, reader.readFloat32());
};


/**
 * @override
 */
gf.sim.Variable.Float.prototype.write = function(target, writer) {
  writer.writeFloat32(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.Float.prototype.copy = function(source, target) {
  this.setter_.call(target, this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.Float.prototype.interpolate = function(source, target, t,
    result) {
  this.setter_.call(result, goog.math.lerp(
      this.getter_.call(source), this.getter_.call(target), t));
};



/**
 * Variable containing a 3-element floating-point vector.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():!goog.vec.Vec3.Float32} getter Function that returns the
 *    value directly (no copy).
 */
gf.sim.Variable.Vec3 = function(flags, getter) {
  goog.base(this, flags);

  /**
   * @private
   * @type {!function():!goog.vec.Vec3.Float32}
   */
  this.getter_ = getter;
};
goog.inherits(gf.sim.Variable.Vec3, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.clone = function() {
  return new gf.sim.Variable.Vec3(this.flags, this.getter_);
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.read = function(target, reader) {
  reader.readVec3(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.write = function(target, writer) {
  writer.writeVec3(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.copy = function(source, target) {
  goog.vec.Vec3.setFromArray(
      this.getter_.call(target),
      this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.interpolate = function(source, target, t,
    result) {
  goog.vec.Vec3.lerp(
      this.getter_.call(source),
      this.getter_.call(target),
      t,
      this.getter_.call(result));
};



/**
 * Variable containing a floating-point quaternion.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():!goog.vec.Quaternion.Float32} getter Function that
 *    returns the value directly (no copy).
 * @param {boolean} normalized True if the quaternion is normalized.
 */
gf.sim.Variable.Quaternion = function(flags, getter, normalized) {
  goog.base(this, flags);

  /**
   * @private
   * @type {!function():!goog.vec.Quaternion.Float32}
   */
  this.getter_ = getter;

  /**
   * True if the quaternion values are normalized.
   * If so, an optimization can be used that allows for the sending of only
   * 3 floats instead of 4 by inferring w.
   * @private
   * @type {boolean}
   */
  this.normalized_ = normalized;
};
goog.inherits(gf.sim.Variable.Quaternion, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.clone = function() {
  return new gf.sim.Variable.Quaternion(this.flags, this.getter_,
      this.normalized_);
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.read = function(target, reader) {
  if (this.normalized_) {
    // Reconstruct w
    var q = this.getter_.call(target);
    reader.readVec3(q);
    // Trick is from http://www.gamedev.net/topic/461253-compressed-quaternions/
    // Known to have issues - may not be worth it
    q[3] = Math.sqrt(1 - q[0] * q[0] + q[1] * q[1] + q[2] * q[2]);
  } else {
    reader.readVec4(this.getter_.call(target));
  }
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.write = function(target, writer) {
  if (this.normalized_) {
    // Just ignore w
    writer.writeVec3(this.getter_.call(target));
  } else {
    writer.writeVec4(this.getter_.call(target));
  }
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.copy = function(source, target) {
  goog.vec.Quaternion.setFromArray(
      this.getter_.call(target),
      this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.interpolate = function(source, target, t,
    result) {
  goog.vec.Quaternion.slerp(
      this.getter_.call(source),
      this.getter_.call(target),
      t,
      this.getter_.call(result));
};
