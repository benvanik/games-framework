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

goog.provide('gf.net.PacketReader');

goog.require('goog.asserts');
goog.require('goog.vec.Mat3');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');
goog.require('goog.vec.Vec4');



/**
 * Utility type for writing packet data.
 * To prevent garbage, create and use a single packet writer instance.
 *
 * @constructor
 */
gf.net.PacketReader = function() {
  /**
   * Scratch buffer.
   * @type {!Uint8Array}
   */
  this.buffer = new Uint8Array(0);

  /**
   * Current byte offset in the buffer.
   * @type {number}
   */
  this.offset = 0;

  /**
   * Used for converting bytes to float32s.
   * @private
   * @type {!Float32Array}
   */
  this.float32_ = new Float32Array(16);

  /**
   * Used for converting bytes to float32s.
   * @private
   * @type {!Uint8Array}
   */
  this.float32byte_ = new Uint8Array(this.float32_.buffer);

  /**
   * Used for converting bytes to float64s.
   * @private
   * @type {Float64Array}
   */
  this.float64_ = goog.global['Float64Array'] ? (new Float64Array(1)) : null;

  /**
   * Used for converting bytes to float64s.
   * @private
   * @type {Uint8Array}
   */
  this.float64byte_ = this.float64_ ?
      new Uint8Array(this.float64_.buffer) : null;
};


/**
 * Maximum length of strings, in bytes.
 * @const
 * @type {number}
 */
gf.net.PacketReader.MAX_STRING_LENGTH = 0xFFFF;


/**
 * Initializes the reader with the given buffer.
 * @param {!ArrayBuffer|!Uint8Array} buffer Array buffer.
 * @param {number} offset Initial offset byte in the buffer.
 */
gf.net.PacketReader.prototype.begin = function(buffer, offset) {
  if (buffer instanceof Uint8Array) {
    this.buffer = buffer;
  } else {
    this.buffer = new Uint8Array(buffer);
  }
  this.offset = offset;
};


/**
 * Checks to see if the given number of bytes are present in the stream.
 * @param {number} length Number of bytes required.
 * @return {boolean} True if there are enough bytes present.
 */
gf.net.PacketReader.prototype.hasBytes = function(length) {
  return this.offset + length <= this.buffer.length;
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readInt8 = function() {
  goog.asserts.assert(this.offset + 1 <= this.buffer.length);
  var b0 = this.buffer[this.offset++];
  return b0 > 128 - 1 ? b0 - 256 : b0;
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readInt16 = function() {
  goog.asserts.assert(this.offset + 2 <= this.buffer.length);
  var b0 = this.buffer[this.offset++];
  var b1 = this.buffer[this.offset++];
  var u = (b0 << 8) | b1;
  return u > 32768 - 1 ? u - 65536 : u;
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readInt32 = function() {
  goog.asserts.assert(this.offset + 4 <= this.buffer.length);
  var b0 = this.buffer[this.offset++];
  var b1 = this.buffer[this.offset++];
  var b2 = this.buffer[this.offset++];
  var b3 = this.buffer[this.offset++];
  var u = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  return u > 2147483648 - 1 ? u - 4294967296 : u;
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readUint8 = function() {
  goog.asserts.assert(this.offset + 1 <= this.buffer.length);
  return this.buffer[this.offset++];
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readUint16 = function() {
  goog.asserts.assert(this.offset + 2 <= this.buffer.length);
  var b0 = this.buffer[this.offset++];
  var b1 = this.buffer[this.offset++];
  return (b0 << 8) | b1;
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readUint32 = function() {
  goog.asserts.assert(this.offset + 4 <= this.buffer.length);
  var b0 = this.buffer[this.offset++];
  var b1 = this.buffer[this.offset++];
  var b2 = this.buffer[this.offset++];
  var b3 = this.buffer[this.offset++];
  return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readVarUint = function() {
  goog.asserts.assert(this.offset + 1 <= this.buffer.length);
  var result = 0;
  var shift = 0;
  var nextByte;
  while ((nextByte = this.buffer[this.offset++] & 0xFF) & 0x80) {
    result |= (nextByte & 0x7F) << shift;
    shift += 7;
  }
  return result | (nextByte << shift);
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readVarInt = function() {
  // Signed integer zigzag coding:
  // https://developers.google.com/protocol-buffers/docs/encoding#types
  var value = this.readVarUint();
  return ((((value << 31) >> 31) ^ value) >> 1) ^ (value & (1 << 31));
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readFloat32 = function() {
  goog.asserts.assert(this.offset + 4 <= this.buffer.length);
  this.float32byte_[0] = this.buffer[this.offset++];
  this.float32byte_[1] = this.buffer[this.offset++];
  this.float32byte_[2] = this.buffer[this.offset++];
  this.float32byte_[3] = this.buffer[this.offset++];
  return this.float32_[0];
  // var b0 = this.buffer[this.offset++];
  // var b1 = this.buffer[this.offset++];
  // var b2 = this.buffer[this.offset++];
  // var b3 = this.buffer[this.offset++];
  // var sign = 1 - (2 * (b0 >> 7));
  // var exponent = (((b0 << 1) & 0xFF) | (b1 >> 7)) - 127;
  // var mantissa = ((b1 & 0x7F) << 16) | (b2 << 8) | b3;
  // if (mantissa === 0 && exponent == -127) {
  //   return 0;
  // } else if (exponent == -127) {
  //   return sign * mantissa * Math.pow(2, -126 - 23);
  // }
  // return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
};


/**
 * Reads a value from the buffer.
 * @return {number} Value read.
 */
gf.net.PacketReader.prototype.readFloat64 = function() {
  goog.asserts.assert(this.float64_);
  goog.asserts.assert(this.float64byte_);
  goog.asserts.assert(this.offset + 8 <= this.buffer.length);
  this.float64byte_[0] = this.buffer[this.offset++];
  this.float64byte_[1] = this.buffer[this.offset++];
  this.float64byte_[2] = this.buffer[this.offset++];
  this.float64byte_[3] = this.buffer[this.offset++];
  this.float64byte_[4] = this.buffer[this.offset++];
  this.float64byte_[5] = this.buffer[this.offset++];
  this.float64byte_[6] = this.buffer[this.offset++];
  this.float64byte_[7] = this.buffer[this.offset++];
  return this.float64_[0];
  // var b0 = this.buffer[this.offset++];
  // var b1 = this.buffer[this.offset++];
  // var b2 = this.buffer[this.offset++];
  // var b3 = this.buffer[this.offset++];
  // var b4 = this.buffer[this.offset++];
  // var b5 = this.buffer[this.offset++];
  // var b6 = this.buffer[this.offset++];
  // var b7 = this.buffer[this.offset++];
  // var sign = 1 - (2 * (b0 >> 7));
  // var exponent = ((((b0 << 1) & 0xFF) << 3) | (b1 >> 4)) - 1023;
  // // Use + and pow instead of | and << to ensure 64bit
  // var mantissa =
  //     ((b1 & 0x0f) * Math.pow(2, 48)) + (b2 * Math.pow(2, 40)) +
  //     (b3 * Math.pow(2, 32)) + (b4 * Math.pow(2, 24)) +
  //     (b5 * Math.pow(2, 16)) + (b6 * Math.pow(2, 8)) + b7;
  // if (mantissa === 0 && exponent == -1023) {
  //   return 0;
  // } else if (exponent == -1023) {
  //   return sign * mantissa * Math.pow(2, -1022 - 52);
  // }
  // return sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);
};


/**
 * Reads a value from the buffer.
 * @param {!goog.vec.Vec3.Float32} value Value to receive the contents.
 */
gf.net.PacketReader.prototype.readVec3 = function(value) {
  goog.asserts.assert(this.offset + 3 * 4 <= this.buffer.length);
  for (var n = 0; n < 3 * 4; n++) {
    this.float32byte_[n] = this.buffer[this.offset++];
  }
  goog.vec.Vec3.setFromArray(value, this.float32_);
};


/**
 * Reads a value from the buffer.
 * @param {!goog.vec.Vec4.Float32} value Value to receive the contents.
 */
gf.net.PacketReader.prototype.readVec4 = function(value) {
  goog.asserts.assert(this.offset + 4 * 4 <= this.buffer.length);
  for (var n = 0; n < 4 * 4; n++) {
    this.float32byte_[n] = this.buffer[this.offset++];
  }
  goog.vec.Vec4.setFromArray(value, this.float32_);
};


/**
 * Reads a value from the buffer.
 * @param {!goog.vec.Mat3.Type} value Value to receive the contents.
 */
gf.net.PacketReader.prototype.readMat3 = function(value) {
  goog.asserts.assert(this.offset + 3 * 3 * 4 <= this.buffer.length);
  for (var n = 0; n < 3 * 3 * 4; n++) {
    this.float32byte_[n] = this.buffer[this.offset++];
  }
  goog.vec.Mat3.setFromArray(value, this.float32_);
};


/**
 * Reads a value from the buffer.
 * @param {!goog.vec.Mat4.Type} value Value to receive the contents.
 */
gf.net.PacketReader.prototype.readMat4 = function(value) {
  goog.asserts.assert(this.offset + 4 * 4 * 4 <= this.buffer.length);
  for (var n = 0; n < 4 * 4 * 4; n++) {
    this.float32byte_[n] = this.buffer[this.offset++];
  }
  goog.vec.Mat4.setFromArray(value, this.float32_);
};


/**
 * Reads a value from the buffer.
 * @param {Uint8Array=} opt_target Target value, used if the size matches.
 * @return {!Uint8Array} Value read.
 */
gf.net.PacketReader.prototype.readUint8Array = function(opt_target) {
  goog.asserts.assert(this.offset + 4 <= this.buffer.length);
  var length = this.readUint32();
  goog.asserts.assert(this.offset + length <= this.buffer.length);
  var result;
  if (opt_target && opt_target.length == length) {
    result = opt_target;
  } else {
    result = new Uint8Array(length);
  }
  for (var n = 0; n < length; n++) {
    result[n] = this.buffer[this.offset++];
  }
  return result;
};


/**
 * Subsets a byte array from the packet buffer, returning an in-place reference.
 * This can be used when a subarray is required for decoding/decompressing data.
 * The reader is advanced by the size of the array.
 * @return {!Uint8Array} Subarray referencing source data.
 */
gf.net.PacketReader.prototype.subsetUint8Array = function() {
  goog.asserts.assert(this.offset + 4 <= this.buffer.length);
  var length = this.readUint32();
  goog.asserts.assert(this.offset + length <= this.buffer.length);
  var start = this.offset;
  this.offset += length;
  return this.buffer.subarray(start, start + length);
};


/**
 * Reads a value from the buffer.
 * @return {string} Value read.
 */
gf.net.PacketReader.prototype.readString = function() {
  // Pair of PacketWriter::writeString
  // Essentially goog.crypt.utf8ByteArrayToString but without as much garbage

  // Wire format:
  // 2b character count
  // 2b byte count
  // (byte count bytes)
  goog.asserts.assert(this.offset + 4 <= this.buffer.length);
  var charCount = this.readUint16();
  var byteCount = this.readUint16();
  goog.asserts.assert(this.offset + byteCount <= this.buffer.length);

  // TODO(benvanik): evaluate not using a temp array
  var out = new Array(charCount);
  var c = 0;
  while (c < charCount) {
    var c1 = this.buffer[this.offset++];
    if (c1 < 128) {
      out[c++] = String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224) {
      var c2 = this.buffer[this.offset++];
      out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
    } else {
      var c2 = this.buffer[this.offset++];
      var c3 = this.buffer[this.offset++];
      out[c++] = String.fromCharCode(
          (c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
    }
  }
  return out.join('');
};


/**
 * Shared packet reader singleton.
 * @private
 * @type {gf.net.PacketReader}
 */
gf.net.PacketReader.sharedReader_ = null;


/**
 * Gets a shared packet reader singleton.
 * @return {!gf.net.PacketReader} Packet reader.
 */
gf.net.PacketReader.getSharedReader = function() {
  if (!gf.net.PacketReader.sharedReader_) {
    gf.net.PacketReader.sharedReader_ = new gf.net.PacketReader();
  }
  return gf.net.PacketReader.sharedReader_;
};
