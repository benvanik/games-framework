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

goog.require('gf.net.PacketReader');
goog.require('gf.net.PacketWriter');
goog.require('gf.vec.Color');
goog.require('goog.asserts');
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
 * Gets a source code statement for read.
 * Used by the JIT system in the variable table.
 * @param {!Object} obj Representative object.
 * @return {string} Source statement.
 */
gf.sim.Variable.prototype.getReadSource = goog.abstractMethod;


/**
 * Gets a source code statement for write.
 * Used by the JIT system in the variable table.
 * @param {!Object} obj Representative object.
 * @return {string} Source statement.
 */
gf.sim.Variable.prototype.getWriteSource = goog.abstractMethod;


/**
 * Gets a source code statement for copy.
 * Used by the JIT system in the variable table.
 * @param {!Object} obj Representative object.
 * @return {string} Source statement.
 */
gf.sim.Variable.prototype.getCopySource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  return 'target.' + setter + '(source.' + getter + '());';
};


/**
 * Gets a source code statement for interpolate.
 * Used by the JIT system in the variable table.
 * @param {!Object} obj Representative object.
 * @return {string} Source statement.
 */
gf.sim.Variable.prototype.getInterpolateSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  return 'result.' + setter + '(target.' + getter + '());';
};


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
 * Gets the compiled name of a member on an object.
 * This looks up by member value, so only use with known-good values.
 * @private
 * @param {!Object} obj Representative object.
 * @param {!Object} memberValue Member value.
 * @return {string?} Member name, if found.
 */
gf.sim.Variable.getCompiledFunctionName_ = function(obj, memberValue) {
  for (var name in obj) {
    if (obj[name] === memberValue) {
      return name;
    }
  }
  goog.asserts.fail('member not found');
  return null;
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
gf.sim.Variable.Integer.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readVarInt);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeVarInt);
  return 'writer.' + writeFn + '(target.' + getter + '() | 0);';
};


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.getCopySource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  return 'target.' + setter + '(source.' + getter + '() | 0);';
};


/**
 * @override
 */
gf.sim.Variable.Integer.prototype.getInterpolateSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  return '' +
      'var _s = source.' + getter + '();' +
      'var _t = target.' + getter + '();' +
      'target.' + setter + '((_s + t * (_t - _s)) | 0);';
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
gf.sim.Variable.Float.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readFloat32);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.Float.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeFloat32);
  return 'writer.' + writeFn + '(target.' + getter + '());';
};


/**
 * @override
 */
gf.sim.Variable.Float.prototype.getInterpolateSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  return '' +
      'var _s = source.' + getter + '();' +
      'var _t = target.' + getter + '();' +
      'result.' + setter + '((_s + t * (_t - _s)));';
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
gf.sim.Variable.Vec3.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readVec3Temp);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeVec3);
  return 'writer.' + writeFn + '(target.' + getter + '());';
};


/**
 * @override
 */
gf.sim.Variable.Vec3.prototype.getInterpolateSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var tmpVec3 = gf.sim.Variable.getCompiledFunctionName_(obj,
      gf.sim.Variable.tmpVec3);
  return '' +
      'var _sv3 = source.' + getter + '();' +
      'var _tv3 = target.' + getter + '();' +
      'var _rv3 = source.' + tmpVec3 + ';' +
      '_rv3[0] = (_tv3[0] - _sv3[0]) * t + _sv3[0];' +
      '_rv3[1] = (_tv3[1] - _sv3[1]) * t + _sv3[1];' +
      '_rv3[2] = (_tv3[2] - _sv3[2]) * t + _sv3[2];' +
      'result.' + setter + '(_rv3);';
};



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
gf.sim.Variable.Quaternion.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readVec4Temp);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeVec4);
  return 'writer.' + writeFn + '(target.' + getter + '());';
};


/**
 * @override
 */
gf.sim.Variable.Quaternion.prototype.getInterpolateSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var tmpQuat = gf.sim.Variable.getCompiledFunctionName_(obj,
      gf.sim.Variable.tmpQuat);
  var slerp = gf.sim.Variable.getCompiledFunctionName_(obj,
      goog.vec.Quaternion.slerp);
  return '' +
      'var _rq = source.' + tmpQuat + ';' +
      'source.' + slerp +
          '(source.' + getter + '(), target.' + getter + '(), t, _rq);' +
      'result.' + setter + '(_rq);';
};



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
gf.sim.Variable.Color.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readUint32);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.Color.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeUint32);
  return 'writer.' + writeFn + '(target.' + getter + '());';
};


/**
 * @override
 */
gf.sim.Variable.Color.prototype.getInterpolateSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var lerp = gf.sim.Variable.getCompiledFunctionName_(obj,
      gf.vec.Color.lerpUint32);
  return '' +
      'result.' + setter + '(source.' + lerp + '(' +
          'source.' + getter + '(), target.' + getter + '(), t));';
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
gf.sim.Variable.String.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readString);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.String.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeString);
  return 'writer.' + writeFn + '(target.' + getter + '());';
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
gf.sim.Variable.UserID.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readString);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.UserID.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeString);
  return 'writer.' + writeFn + '(target.' + getter + '());';
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
gf.sim.Variable.EntityID.prototype.getReadSource = function(obj) {
  var setter = gf.sim.Variable.getCompiledFunctionName_(obj, this.setter_);
  var reader = gf.net.PacketReader.getSharedReader();
  var readFn = gf.sim.Variable.getCompiledFunctionName_(
      reader, reader.readVarUint);
  return 'target.' + setter + '(reader.' + readFn + '());';
};


/**
 * @override
 */
gf.sim.Variable.EntityID.prototype.getWriteSource = function(obj) {
  var getter = gf.sim.Variable.getCompiledFunctionName_(obj, this.getter_);
  var writer = gf.net.PacketWriter.getSharedWriter();
  var writeFn = gf.sim.Variable.getCompiledFunctionName_(
      writer, writer.writeVarUint);
  return 'writer.' + writeFn + '(target.' + getter + '());';
};


/**
 * Scratch Vec3 for math.
 * @type {!goog.vec.Vec3.Float32}
 */
gf.sim.Variable.tmpVec3 = goog.vec.Vec3.createFloat32();


/**
 * Scratch Quaternion for math.
 * @type {!goog.vec.Quaternion.Float32}
 */
gf.sim.Variable.tmpQuat = goog.vec.Quaternion.createFloat32();
