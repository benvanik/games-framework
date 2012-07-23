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

goog.provide('gf.net.PacketWriter');

goog.require('goog.asserts');



/**
 * Utility type for writing packet data.
 * To prevent garbage, create and use a single packet writer instance.
 *
 * @constructor
 */
gf.net.PacketWriter = function() {
  /**
   * Scratch buffer.
   * @type {!Uint8Array}
   */
  this.buffer = new Uint8Array(512);

  /**
   * Current byte offset in the buffer.
   * @type {number}
   */
  this.offset = 0;

  /**
   * Used for converting float32s to bytes.
   * @private
   * @type {!Float32Array}
   */
  this.float32_ = new Float32Array(16);

  /**
   * Used for converting float32s to bytes.
   * @private
   * @type {!Uint8Array}
   */
  this.float32byte_ = new Uint8Array(this.float32_.buffer);

  /**
   * Used for converting float64s to bytes.
   * @private
   * @type {Float64Array}
   */
  this.float64_ = goog.global['Float64Array'] ? (new Float64Array(1)) : null;

  /**
   * Used for converting float64s to bytes.
   * @private
   * @type {Uint8Array}
   */
  this.float64byte_ = this.float64_ ?
      new Uint8Array(this.float64_.buffer) : null;
};


/**
 * Minimum number of bytes to grow by when an expansion is required.
 * @private
 * @const
 * @type {number}
 */
gf.net.PacketWriter.GROWTH_INCREMENT_ = 1024;


/**
 * Maximum length of strings, in bytes.
 * @const
 * @type {number}
 */
gf.net.PacketWriter.MAX_STRING_LENGTH = 0xFFFF;


/**
 * Drops any in-progress packet writing.
 */
gf.net.PacketWriter.prototype.drop = function() {
  this.offset = 0;
};


/**
 * Returns a copy of the buffer sized to the contents and resets all state.
 * @return {!ArrayBuffer} Cloned data buffer.
 */
gf.net.PacketWriter.prototype.finish = function() {
  var copy = new Uint8Array(this.offset);
  for (var n = 0; n < this.offset; n++) {
    copy[n] = this.buffer[n];
  }
  this.offset = 0;
  return /** @type {!ArrayBuffer} */ (copy.buffer);
};


/**
 * Ensures that at least the given number of bytes are available in the buffer.
 * @param {number} size Number of bytes to ensure available.
 */
gf.net.PacketWriter.prototype.ensureCapacity = function(size) {
  if (this.offset + size > this.buffer.length) {
    var goalSize = this.offset + size;
    var newSize = this.buffer.length;
    do {
      newSize += gf.net.PacketWriter.GROWTH_INCREMENT_;
    } while (newSize < goalSize);
    var copy = new Uint8Array(newSize);
    for (var n = 0; n < this.offset; n++) {
      copy[n] = this.buffer[n];
    }
    this.buffer = copy;
  }
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeInt8 = function(value) {
  this.ensureCapacity(1);
  this.buffer[this.offset++] = value;
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeInt16 = function(value) {
  this.ensureCapacity(2);
  this.buffer[this.offset++] = value >> 8;
  this.buffer[this.offset++] = value;
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeInt32 = function(value) {
  this.ensureCapacity(4);
  this.buffer[this.offset++] = value >> 24;
  this.buffer[this.offset++] = value >> 16;
  this.buffer[this.offset++] = value >> 8;
  this.buffer[this.offset++] = value;
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeUint8 = function(value) {
  this.ensureCapacity(1);
  this.buffer[this.offset++] = value;
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeUint16 = function(value) {
  this.ensureCapacity(2);
  this.buffer[this.offset++] = value >> 8;
  this.buffer[this.offset++] = value;
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeUint32 = function(value) {
  this.ensureCapacity(4);
  this.buffer[this.offset++] = value >> 24;
  this.buffer[this.offset++] = value >> 16;
  this.buffer[this.offset++] = value >> 8;
  this.buffer[this.offset++] = value;
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeVarInt = function(value) {
  this.ensureCapacity(5);
  var bytesWritten = 0;
  do {
    var nextByte = value & 0x7F;
    if (value >= 0x80) {
      nextByte |= 0x80;
    }
    this.buffer[this.offset++] = nextByte;
    value >>>= 7;
  } while (value);
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeFloat32 = function(value) {
  this.ensureCapacity(4);
  this.float32_[0] = value;
  this.buffer[this.offset++] = this.float32byte_[0];
  this.buffer[this.offset++] = this.float32byte_[1];
  this.buffer[this.offset++] = this.float32byte_[2];
  this.buffer[this.offset++] = this.float32byte_[3];
};


/**
 * Writes a value to the buffer.
 * @param {number} value Value to write.
 */
gf.net.PacketWriter.prototype.writeFloat64 = function(value) {
  goog.asserts.assert(this.float64_);
  goog.asserts.assert(this.float64byte_);
  this.ensureCapacity(8);
  this.float64_[0] = value;
  this.buffer[this.offset++] = this.float64byte_[0];
  this.buffer[this.offset++] = this.float64byte_[1];
  this.buffer[this.offset++] = this.float64byte_[2];
  this.buffer[this.offset++] = this.float64byte_[3];
  this.buffer[this.offset++] = this.float64byte_[4];
  this.buffer[this.offset++] = this.float64byte_[5];
  this.buffer[this.offset++] = this.float64byte_[6];
  this.buffer[this.offset++] = this.float64byte_[7];
};


/**
 * Writes a value to the buffer.
 * @param {!goog.vec.Vec3.Float32} value Value to write.
 */
gf.net.PacketWriter.prototype.writeVec3 = function(value) {
  this.ensureCapacity(3 * 4);
  this.float32_[0] = value[0];
  this.float32_[1] = value[1];
  this.float32_[2] = value[2];
  for (var n = 0; n < 3 * 4; n++) {
    this.buffer[this.offset++] = this.float32byte_[n];
  }
};


/**
 * Writes a value to the buffer.
 * @param {!goog.vec.Vec4.Float32} value Value to write.
 */
gf.net.PacketWriter.prototype.writeVec4 = function(value) {
  this.ensureCapacity(4 * 4);
  this.float32_[0] = value[0];
  this.float32_[1] = value[1];
  this.float32_[2] = value[2];
  this.float32_[3] = value[3];
  for (var n = 0; n < 4 * 4; n++) {
    this.buffer[this.offset++] = this.float32byte_[n];
  }
};


/**
 * Writes a value to the buffer.
 * @param {!goog.vec.Mat3.Type} value Value to write.
 */
gf.net.PacketWriter.prototype.writeMat3 = function(value) {
  this.ensureCapacity(3 * 3 * 4);
  for (var n = 0; n < 3 * 3; n++) {
    this.float32_[n] = value[n];
  }
  for (var n = 0; n < 3 * 3 * 4; n++) {
    this.buffer[this.offset++] = this.float32byte_[n];
  }
};


/**
 * Writes a value to the buffer.
 * @param {!goog.vec.Mat4.Type} value Value to write.
 */
gf.net.PacketWriter.prototype.writeMat4 = function(value) {
  this.ensureCapacity(4 * 4 * 4);
  for (var n = 0; n < 4 * 4; n++) {
    this.float32_[n] = value[n];
  }
  for (var n = 0; n < 4 * 4 * 4; n++) {
    this.buffer[this.offset++] = this.float32byte_[n];
  }
};


/**
 * Writes a value to the buffer.
 * @param {!Uint8Array} value Value to write.
 */
gf.net.PacketWriter.prototype.writeUint8Array = function(value) {
  this.ensureCapacity(4 + value.length);
  this.writeUint32(value.length);
  for (var n = 0; n < value.length; n++) {
    this.buffer[this.offset++] = value[n];
  }
};


/**
 * Begins writing a Uint8Array.
 * Enough space given the maximum length is allocated and returned as a subarray
 * reference. Once all of the data has been written in use
 * {@see gf.net.PacketWriter#endWriteUint8Array} to complete the operation,
 * including the final length of the array.
 * @param {number} maxLength Maximum length of the array.
 * @return {!Uint8Array} A subarray into the packet writing buffer.
 */
gf.net.PacketWriter.prototype.beginWriteUint8Array = function(maxLength) {
  this.ensureCapacity(4 + maxLength);
  // Note that we don't increase the offset here - that will happen at the end
  var start = this.offset + 4;
  return this.buffer.subarray(start, start + maxLength);
};


/**
 * Ends writing a Uint8Array.
 * @param {number} finalLength Total number of bytes written.
 */
gf.net.PacketWriter.prototype.endWriteUint8Array = function(finalLength) {
  this.writeUint32(finalLength);
  this.offset += finalLength;
};


/**
 * Writes a value to the buffer.
 * @param {string} value Value to write.
 */
gf.net.PacketWriter.prototype.writeString = function(value) {
  // This implementation comes from goog.crypt.stringToUtf8ByteArray, but is
  // designed to not create garbage

  // Limit the length
  // Apps shouldn't be sending strings over this limit so assert, but don't
  // allow unchecked builds to write garbage
  goog.asserts.assert(value.length < gf.net.PacketWriter.MAX_STRING_LENGTH);
  if (value.length >= gf.net.PacketWriter.MAX_STRING_LENGTH) {
    value = value.substr(0, gf.net.PacketWriter.MAX_STRING_LENGTH);
  }

  // Wire format:
  // 2b character count
  // 2b byte count
  // (at most 3x character count bytes)
  this.ensureCapacity(2 + 2 + value.length * 3);

  // Character count
  this.writeUint16(value.length);

  // Hold a space for the byte count
  var byteCountOffset = this.offset;
  this.offset += 2;

  var byteCount = 0;
  for (var n = 0; n < value.length; n++) {
    var c = value.charCodeAt(n);
    if (c < 128) {
      this.buffer[this.offset++] = c;
      byteCount++;
    } else if (c < 2048) {
      this.buffer[this.offset++] = (c >> 6) | 192;
      this.buffer[this.offset++] = (c & 63) | 128;
      byteCount += 2;
    } else {
      this.buffer[this.offset++] = (c >> 12) | 224;
      this.buffer[this.offset++] = ((c >> 6) & 63) | 128;
      this.buffer[this.offset++] = (c & 63) | 128;
      byteCount += 3;
    }
  }
  var oldOffset = this.offset;
  this.offset = byteCountOffset;
  this.writeUint16(byteCount);
  this.offset = oldOffset;
};


/**
 * Shared packet writer singleton.
 * @private
 * @type {gf.net.PacketWriter}
 */
gf.net.PacketWriter.sharedWriter_ = null;


/**
 * Gets a shared packet writer singleton.
 * @return {!gf.net.PacketWriter} Packet writer.
 */
gf.net.PacketWriter.getSharedWriter = function() {
  if (!gf.net.PacketWriter.sharedWriter_) {
    gf.net.PacketWriter.sharedWriter_ = new gf.net.PacketWriter();
  }
  return gf.net.PacketWriter.sharedWriter_;
};
