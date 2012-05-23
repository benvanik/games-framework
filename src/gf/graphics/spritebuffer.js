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
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.graphics.SpriteBuffer');
goog.provide('gf.graphics.SpriteProgram');

goog.require('gf.graphics.GeometryPool');
goog.require('goog.asserts');
goog.require('goog.vec.Mat4');
goog.require('goog.webgl');



/**
 * A program that implements a 2D quad drawer.
 * @interface
 */
gf.graphics.SpriteProgram = function() {};


/** @type {number} */
gf.graphics.SpriteProgram.prototype.a_position;


/** @type {number} */
gf.graphics.SpriteProgram.prototype.a_texCoord;


/** @type {number} */
gf.graphics.SpriteProgram.prototype.a_color;


/** @type {WebGLUniformLocation} */
gf.graphics.SpriteProgram.prototype.u_worldViewProjMatrix;


/** @type {WebGLUniformLocation} */
gf.graphics.SpriteProgram.prototype.u_texSampler;


/** @type {WebGLUniformLocation} */
gf.graphics.SpriteProgram.prototype.u_color;



/**
 * Efficient 2D sprite drawer.
 *
 * @constructor
 * @extends {gf.graphics.GeometryPool}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {!gf.graphics.SpriteProgram} spriteProgram Program implementing the
 *     {@see gf.graphics.SpriteProgram} interface for drawing quads.
 */
gf.graphics.SpriteBuffer = function(graphicsContext, spriteProgram) {
  goog.base(this, graphicsContext,
      gf.graphics.SpriteBuffer.BYTES_PER_SPRITE_);

  /**
   * Sprite program.
   * @private
   * @type {gf.graphics.SpriteProgram}
   */
  this.spriteProgram_ = spriteProgram;

  /**
   * Float32 accessor into data.
   * @private
   * @type {!Float32Array}
   */
  this.floatData_ = new Float32Array(this.slotData);

  /**
   * Uint32 accessor into data.
   * @private
   * @type {!Uint32Array}
   */
  this.uint32Data_ = new Uint32Array(this.slotData);
};
goog.inherits(gf.graphics.SpriteBuffer, gf.graphics.GeometryPool);


/**
 * Number of indices per sprite.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.INDICES_PER_SPRITE_ = 6;


/**
 * Total number of bytes per vertex.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.BYTES_PER_VERTEX_ =
    3 * 4 +
    2 * 4 +
    1 * 4;


/**
 * Number of floats per vertex.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.FLOATS_PER_VERTEX_ = 6;


/**
 * Number of vertices per sprite.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.VERTICES_PER_SPRITE_ = 4;


/**
 * Total number of bytes per quad.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.BYTES_PER_SPRITE_ =
    gf.graphics.SpriteBuffer.VERTICES_PER_SPRITE_ *
    gf.graphics.SpriteBuffer.BYTES_PER_VERTEX_;


/**
 * Byte offset of the position vertex attribute.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.POSITION_ATTRIB_OFFSET_ = 0;


/**
 * Byte offset of the color vertex attribute.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.TEXCOORD_ATTRIB_OFFSET_ = 3 * 4;


/**
 * Byte offset of the color vertex attribute.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.SpriteBuffer.COLOR_ATTRIB_OFFSET_ = 3 * 4 + 2 * 4;


/**
 * @override
 */
gf.graphics.SpriteBuffer.prototype.dataBufferChanged = function() {
  this.floatData_ = new Float32Array(this.slotData);
  this.uint32Data_ = new Uint32Array(this.slotData);
};


/**
 * Vertices used in a sprite, all in [0-1].
 * [position, texCoords, [color]]
 * @private
 * @type {!Float32Array}
 */
gf.graphics.SpriteBuffer.spriteTemplate_ = new Float32Array([
  0, 0, 0, 0, 0, 0,
  0, 1, 0, 0, 1, 0,
  1, 0, 0, 1, 0, 0,
  1, 1, 0, 1, 1, 0
]);


/**
 * Adds a sprite to the buffer.
 * @param {number} sx Source texture rect X ([0-1]).
 * @param {number} sy Source texture rect Y ([0-1]).
 * @param {number} sw Source texture rect width ([0-1]).
 * @param {number} sh Source texture rect height ([0-1]).
 * @param {number} color 32-bit ABGR color.
 * @param {number} dx Destination rect X.
 * @param {number} dy Destination rect Y.
 * @param {number} dw Destination rect width.
 * @param {number} dh Destination rect height.
 * @param {number=} opt_depth Destination depth.
 * @return {number} Sprite slot.
 */
gf.graphics.SpriteBuffer.prototype.add = function(
    sx, sy, sw, sh, color, dx, dy, dw, dh, opt_depth) {
  // Allocate a new segment, expanding if required
  var slot = this.allocateSlot();
  if (slot == gf.graphics.GeometryPool.INVALID_SLOT) {
    return slot;
  }

  var z = opt_depth || 0;

  // Write vertex data
  var template = gf.graphics.SpriteBuffer.spriteTemplate_;
  var floatData = this.floatData_;
  var uint32Data = this.uint32Data_;
  var o = slot * this.slotSize / 4;
  for (var n = 0, v = 0; n < gf.graphics.SpriteBuffer.VERTICES_PER_SPRITE_;
      n++, v += gf.graphics.SpriteBuffer.FLOATS_PER_VERTEX_) {
    floatData[o + v + 0] = template[v + 0] * dw + dx;
    floatData[o + v + 1] = template[v + 1] * dh + dy;
    floatData[o + v + 2] = template[v + 2] + z;
    floatData[o + v + 3] = template[v + 3] ? (sx + sw) : sx;
    floatData[o + v + 4] = template[v + 4] ? (sy + sh) : sy;
    uint32Data[o + v + 5] = color;
  }

  return slot;
};


/**
 * Updates a sprite in the buffer.
 * @param {number} slot Previously allocated slot to update.
 * @param {number} sx Source texture rect X ([0-1]).
 * @param {number} sy Source texture rect Y ([0-1]).
 * @param {number} sw Source texture rect width ([0-1]).
 * @param {number} sh Source texture rect height ([0-1]).
 * @param {number} color 32-bit ABGR color.
 * @param {number} dx Destination rect X.
 * @param {number} dy Destination rect Y.
 * @param {number} dw Destination rect width.
 * @param {number} dh Destination rect height.
 * @param {number=} opt_depth Destination depth.
 */
gf.graphics.SpriteBuffer.prototype.update = function(
    slot, sx, sy, sw, sh, color, dx, dy, dw, dh, opt_depth) {
  var z = opt_depth || 0;

  // Write vertex data
  var template = gf.graphics.SpriteBuffer.spriteTemplate_;
  var floatData = this.floatData_;
  var uint32Data = this.uint32Data_;
  var o = slot * this.slotSize / 4;
  for (var n = 0, v = 0; n < gf.graphics.SpriteBuffer.VERTICES_PER_SPRITE_;
      n++, v += gf.graphics.SpriteBuffer.FLOATS_PER_VERTEX_) {
    floatData[o + v + 0] = template[v + 0] * dw + dx;
    floatData[o + v + 1] = template[v + 1] * dh + dy;
    floatData[o + v + 2] = template[v + 2] + z;
    floatData[o + v + 3] = template[v + 3] ? (sx + sw) : sx;
    floatData[o + v + 4] = template[v + 4] ? (sy + sh) : sy;
    uint32Data[o + v + 5] = color;
  }

  this.invalidateSlot(slot);
};


/**
 * Removes a sprite from the buffer.
 * @param {number} slot Previously allocated slot to remove.
 */
gf.graphics.SpriteBuffer.prototype.remove = function(slot) {
  var floatData = this.floatData_;
  var o = slot * this.slotSize;
  for (var n = 0; n < gf.graphics.SpriteBuffer.VERTICES_PER_SPRITE_; n++) {
    floatData[o + 0] = 0;
    floatData[o + 1] = 0;
    floatData[o + 2] = 0;
    o += gf.graphics.SpriteBuffer.BYTES_PER_SPRITE_;
  }

  this.deallocateSlot(slot);
};


/**
 * Draws the sprite buffer.
 * @param {!goog.vec.Mat4.Type} viewProjMatrix View-projection matrix.
 * @param {goog.vec.Mat4.Type=} opt_worldMatrix World matrix.
 * @param {goog.vec.Vec4.Float32=} opt_color RGBA color modulator.
 */
gf.graphics.SpriteBuffer.prototype.draw = function(viewProjMatrix,
    opt_worldMatrix, opt_color) {
  var gl = this.graphicsContext.gl;
  var program = this.spriteProgram_;

  // Early exit if no sprites
  if (!this.slotMax) {
    return;
  }

  // Set uniforms
  if (opt_worldMatrix) {
    // TODO(benvanik): evaluate if faster to do in the shaders
    var tmpMat4 = gf.graphics.SpriteBuffer.tmpMat4_;
    goog.vec.Mat4.multMat(
        viewProjMatrix,
        opt_worldMatrix,
        tmpMat4);
    gl.uniformMatrix4fv(program.u_worldViewProjMatrix, false, tmpMat4);
  } else {
    gl.uniformMatrix4fv(program.u_worldViewProjMatrix, false,
        viewProjMatrix);
  }
  if (goog.isDef(opt_color)) {
    gl.uniform4fv(program.u_color, opt_color);
  } else {
    gl.uniform4f(program.u_color, 1, 1, 1, 1);
  }

  // Prepare for drawing
  this.prepareDraw();

  // Setup buffers
  // TODO(benvanik): VAOs
  gl.vertexAttribPointer(
      program.a_position,
      3,
      goog.webgl.FLOAT,
      false,
      gf.graphics.SpriteBuffer.BYTES_PER_VERTEX_,
      gf.graphics.SpriteBuffer.POSITION_ATTRIB_OFFSET_);
  gl.vertexAttribPointer(
      program.a_texCoord,
      2,
      goog.webgl.FLOAT,
      false,
      gf.graphics.SpriteBuffer.BYTES_PER_VERTEX_,
      gf.graphics.SpriteBuffer.TEXCOORD_ATTRIB_OFFSET_);
  gl.vertexAttribPointer(
      program.a_color,
      4,
      goog.webgl.UNSIGNED_BYTE,
      true,
      gf.graphics.SpriteBuffer.BYTES_PER_VERTEX_,
      gf.graphics.SpriteBuffer.COLOR_ATTRIB_OFFSET_);

  // Draw!
  var elementCount = this.slotMax *
      gf.graphics.SpriteBuffer.INDICES_PER_SPRITE_;
  gl.drawElements(
      goog.webgl.TRIANGLES,
      elementCount,
      goog.webgl.UNSIGNED_SHORT,
      0);
};


/**
 * Creates a shared index buffer used when drawing sprites.
 * @param {!WebGLRenderingContext} gl Target context.
 * @return {WebGLBuffer} Index buffer.
 */
gf.graphics.SpriteBuffer.createIndexBuffer = function(gl) {
  var buffer = gl.createBuffer();
  goog.asserts.assert(buffer);

  // Maximum number of sprites that will fit
  // TODO(benvanik): maybe smaller? probably not all needed...
  var maxSpriteCount = Math.floor(
      0xFFFF / gf.graphics.SpriteBuffer.INDICES_PER_SPRITE_);

  // Total number of indices in the buffer
  var indexCount = maxSpriteCount *
      gf.graphics.SpriteBuffer.INDICES_PER_SPRITE_;
  goog.asserts.assert(indexCount <= 0xFFFF);

  // Create data
  var baseIndices = new Uint16Array([0, 1, 2, 2, 1, 3]);
  var indexData = new Uint16Array(indexCount);
  for (var n = 0, i = 0, v = 0; n < maxSpriteCount; n++) {
    for (var m = 0; m < baseIndices.length; m++) {
      indexData[i + m] = baseIndices[m] + v;
    }
    i += baseIndices.length;
    v += gf.graphics.SpriteBuffer.VERTICES_PER_SPRITE_;
  }

  // Uplaod data
  gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(goog.webgl.ELEMENT_ARRAY_BUFFER, indexData,
      goog.webgl.STATIC_DRAW);
  gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, null);

  return buffer;
};


/**
 * Temporary mat4.
 * @private
 * @type {!goog.vec.Mat4.Type}
 */
gf.graphics.SpriteBuffer.tmpMat4_ = goog.vec.Mat4.createFloat32();
