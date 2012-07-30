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
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 */
gf.sim.Variable = function(tag, flags) {
  /**
   * Runtime tag.
   * This is used to enable entity state implementations to rendezvous with the
   * variable ordinals. A compiler could obviate the need for these, but that's
   * a lot more work.
   * @type {number}
   */
  this.tag = tag;

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
 * Next tag ID to assign.
 * @private
 * @type {number}
 */
gf.sim.Variable.nextTagId_ = 0;


/**
 * Gets a unique tag ID that can be used when creating variables.
 * These IDs are build specific and should not be used for anything but runtime
 * assignment.
 * @return {number} A tag ID.
 */
gf.sim.Variable.getUniqueTag = function() {
  return gf.sim.Variable.nextTagId_++;
};


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
   * Variable will update frequently (perhaps every tick) and should get
   * optimized placement in the lookup table.
   * Examples: actor position.
   */
  UPDATED_FREQUENTLY: 1 << 0,

  /**
   * Variable is predicted on the client.
   * Signals that the variable will be modified during the prediction process.
   * Entities must also have prediction enabled on them.
   * Examples: local player position.
   */
  PREDICTED: 1 << 1,

  /**
   * Variable is interpolated on the client.
   * Any variable that must be interpolated between server sync updates can
   * set this bit.
   * Examples: remote/AI actor position, animation state.
   */
  INTERPOLATED: 1 << 2
};



/**
 * Variable containing a 32-bit integer.
 * Serialized on the network as a varint.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():number} getter Prototype function that gets the value.
 * @param {!function(number)} setter Prototype function that sets the value.
 */
gf.sim.Variable.Integer = function(tag, flags, getter, setter) {
  goog.base(this, tag, flags);

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
goog.inherits(gf.sim.Variable.Integer, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.clone = function() {
  return new gf.sim.Variable.Integer(this.tag, this.flags,
      this.getter_, this.setter_);
};


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.read = function(target, reader) {
  this.setter_.call(target, reader.readVarInt());
};


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.write = function(target, writer) {
  writer.writeVarInt(this.getter_.call(target) | 0);
};


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.copy = function(source, target) {
  this.setter_.call(target, this.getter_.call(source) | 0);
};


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.interpolate = function(source, target, t,
    result) {
  var sourceValue = this.getter_.call(source) | 0;
  var targetValue = this.getter_.call(target) | 0;
  this.setter_.call(result,
      (sourceValue + t * (targetValue - sourceValue)) | 0);
};



/**
 * Variable containing a floating-point number.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():number} getter Prototype function that gets the value.
 * @param {!function(number)} setter Prototype function that sets the value.
 */
gf.sim.Variable.Float = function(tag, flags, getter, setter) {
  goog.base(this, tag, flags);

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
  return new gf.sim.Variable.Float(this.tag, this.flags,
      this.getter_, this.setter_);
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
  var sourceValue = this.getter_.call(source);
  var targetValue = this.getter_.call(target);
  this.setter_.call(result, sourceValue + t * (targetValue - sourceValue));
};



/**
 * Variable containing a 3-element floating-point vector.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():!goog.vec.Vec3.Float32} getter Function that returns the
 *     value directly (no copy).
 * @param {!function(!goog.vec.Vec3.Float32)} setter Prototype function that
 *     sets the value.
 */
gf.sim.Variable.Vec3 = function(tag, flags, getter, setter) {
  goog.base(this, tag, flags);

  /**
   * @private
   * @type {!function():!goog.vec.Vec3.Float32}
   */
  this.getter_ = getter;

  /**
   * @private
   * @type {!function(!goog.vec.Vec3.Float32)}
   */
  this.setter_ = setter;
};
goog.inherits(gf.sim.Variable.Vec3, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.clone = function() {
  return new gf.sim.Variable.Vec3(this.tag, this.flags,
      this.getter_, this.setter_);
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.read = function(target, reader) {
  var v = gf.sim.Variable.Vec3.tmp_;
  reader.readVec3(v);
  this.setter_.call(target, v);
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
  this.setter_.call(target, this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.interpolate = function(source, target, t,
    result) {
  var v = gf.sim.Variable.Vec3.tmp_;
  goog.vec.Vec3.lerp(
      this.getter_.call(source),
      this.getter_.call(target),
      t,
      v);
  this.setter_.call(result, v);
};


/**
 * Scratch Vec3 for math.
 * @private
 * @type {!goog.vec.Vec3.Float32}
 */
gf.sim.Variable.Vec3.tmp_ = goog.vec.Vec3.createFloat32();



/**
 * Variable containing a floating-point quaternion.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():!goog.vec.Quaternion.Float32} getter Function that
 *     returns the value directly (no copy).
 * @param {!function(!goog.vec.Quaternion.Float32)} setter Prototype function
 *     that sets the value.
 * @param {boolean} normalized True if the quaternion is normalized.
 */
gf.sim.Variable.Quaternion = function(tag, flags, getter, setter, normalized) {
  goog.base(this, tag, flags);

  /**
   * @private
   * @type {!function():!goog.vec.Quaternion.Float32}
   */
  this.getter_ = getter;

  /**
   * @private
   * @type {!function(!goog.vec.Quaternion.Float32)}
   */
  this.setter_ = setter;

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
  return new gf.sim.Variable.Quaternion(this.tag, this.flags,
      this.getter_, this.setter_, this.normalized_);
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.read = function(target, reader) {
  var q = gf.sim.Variable.Quaternion.tmp_;
  // if (this.normalized_) {
  //   // Reconstruct w
  //   reader.readVec3(q);
  //   // Trick is from http://www.gamedev.net/topic/461253-compressed-quaternions/
  //   // Known to have issues - may not be worth it
  //   q[3] = Math.sqrt(1 - q[0] * q[0] + q[1] * q[1] + q[2] * q[2]);
  // } else {
  reader.readVec4(q);
  this.setter_.call(target, q);
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.write = function(target, writer) {
  // if (this.normalized_) {
  //   // Just ignore w
  //   writer.writeVec3(this.getter_.call(target));
  // } else {
  writer.writeVec4(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.copy = function(source, target) {
  this.setter_.call(target, this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.interpolate = function(source, target, t,
    result) {
  var q = gf.sim.Variable.Quaternion.tmp_;
  goog.vec.Quaternion.slerp(
      this.getter_.call(source),
      this.getter_.call(target),
      t,
      q);
  this.setter_.call(result, q);
};


/**
 * Scratch Quaternion for math.
 * @private
 * @type {!goog.vec.Quaternion.Float32}
 */
gf.sim.Variable.Quaternion.tmp_ = goog.vec.Quaternion.createFloat32();



/**
 * Variable containing an ARGB color.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():number} getter Prototype function that gets the value.
 * @param {!function(number)} setter Prototype function that sets the value.
 */
gf.sim.Variable.Color = function(tag, flags, getter, setter) {
  goog.base(this, tag, flags);

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
goog.inherits(gf.sim.Variable.Color, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.Color.prototype.clone = function() {
  return new gf.sim.Variable.Color(this.tag, this.flags,
      this.getter_, this.setter_);
};


/**
 * @override
 */
gf.sim.Variable.Color.prototype.read = function(target, reader) {
  this.setter_.call(target, reader.readFloat32());
};


/**
 * @override
 */
gf.sim.Variable.Color.prototype.write = function(target, writer) {
  writer.writeFloat32(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.Color.prototype.copy = function(source, target) {
  this.setter_.call(target, this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.Color.prototype.interpolate = function(source, target, t,
    result) {
  // There has got to be a better way...
  // Knowing that t = [0,1], I'm sure it's possible to do this in two mults
  var sourceValue = this.getter_.call(source);
  var sourceA = (sourceValue >> 24) & 0xFF;
  var sourceB = (sourceValue >> 16) & 0xFF;
  var sourceG = (sourceValue >> 8) & 0xFF;
  var sourceR = sourceValue & 0xFF;
  var targetValue = this.getter_.call(target);
  var targetA = (sourceValue >> 24) & 0xFF;
  var targetB = (sourceValue >> 16) & 0xFF;
  var targetG = (sourceValue >> 8) & 0xFF;
  var targetR = sourceValue & 0xFF;
  var value =
      ((sourceA + t * (targetA - sourceA)) & 0xFF) << 24 |
      ((sourceB + t * (targetB - sourceB)) & 0xFF) << 16 |
      ((sourceG + t * (targetG - sourceG)) & 0xFF) << 8 |
      ((sourceR + t * (targetR - sourceR)) & 0xFF);
  this.setter_.call(result, value);
};



/**
 * Variable containing a string.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():string} getter Prototype function that gets the value.
 * @param {!function(string)} setter Prototype function that sets the value.
 */
gf.sim.Variable.String = function(tag, flags, getter, setter) {
  goog.base(this, tag, flags);

  /**
   * @private
   * @type {!function():string}
   */
  this.getter_ = getter;

  /**
   * @private
   * @type {!function(string)}
   */
  this.setter_ = setter;
};
goog.inherits(gf.sim.Variable.String, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.String.prototype.clone = function() {
  return new gf.sim.Variable.String(this.tag, this.flags,
      this.getter_, this.setter_);
};


/**
 * @override
 */
gf.sim.Variable.String.prototype.read = function(target, reader) {
  this.setter_.call(target, reader.readString());
};


/**
 * @override
 */
gf.sim.Variable.String.prototype.write = function(target, writer) {
  writer.writeString(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.String.prototype.copy = function(source, target) {
  this.setter_.call(target, this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.String.prototype.interpolate = function(source, target, t,
    result) {
  // Instantaneous to target
  this.setter_.call(result, this.getter_.call(target));
};



/**
 * Variable containing a user ID.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():string} getter Prototype function that gets the value.
 * @param {!function(string)} setter Prototype function that sets the value.
 */
gf.sim.Variable.UserID = function(tag, flags, getter, setter) {
  goog.base(this, tag, flags);

  /**
   * @private
   * @type {!function():string}
   */
  this.getter_ = getter;

  /**
   * @private
   * @type {!function(string)}
   */
  this.setter_ = setter;
};
goog.inherits(gf.sim.Variable.UserID, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.UserID.prototype.clone = function() {
  return new gf.sim.Variable.UserID(this.tag, this.flags,
      this.getter_, this.setter_);
};


/**
 * @override
 */
gf.sim.Variable.UserID.prototype.read = function(target, reader) {
  this.setter_.call(target, reader.readString());
};


/**
 * @override
 */
gf.sim.Variable.UserID.prototype.write = function(target, writer) {
  writer.writeString(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.UserID.prototype.copy = function(source, target) {
  this.setter_.call(target, this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.UserID.prototype.interpolate = function(source, target, t,
    result) {
  // Instantaneous to target
  this.setter_.call(result, this.getter_.call(target));
};



/**
 * Variable containing an entity ID.
 *
 * @constructor
 * @extends {gf.sim.Variable}
 * @param {number} tag Tag, from {@see gf.sim.Variable#getUniqueTag}.
 * @param {number} flags Bitmask of {@see gf.sim.VariableFlag} values.
 * @param {!function():number} getter Prototype function that gets the value.
 * @param {!function(number)} setter Prototype function that sets the value.
 */
gf.sim.Variable.EntityID = function(tag, flags, getter, setter) {
  goog.base(this, tag, flags);

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
goog.inherits(gf.sim.Variable.EntityID, gf.sim.Variable);


/**
 * @override
 */
gf.sim.Variable.EntityID.prototype.clone = function() {
  return new gf.sim.Variable.EntityID(this.tag, this.flags,
      this.getter_, this.setter_);
};


/**
 * @override
 */
gf.sim.Variable.EntityID.prototype.read = function(target, reader) {
  this.setter_.call(target, reader.readVarUint());
};


/**
 * @override
 */
gf.sim.Variable.EntityID.prototype.write = function(target, writer) {
  writer.writeVarUint(this.getter_.call(target));
};


/**
 * @override
 */
gf.sim.Variable.EntityID.prototype.copy = function(source, target) {
  this.setter_.call(target, this.getter_.call(source));
};


/**
 * @override
 */
gf.sim.Variable.EntityID.prototype.interpolate = function(source, target, t,
    result) {
  // Instantaneous to target
  this.setter_.call(result, this.getter_.call(target));
};
