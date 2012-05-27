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

goog.provide('gf.graphics.VertexArrayObject');
goog.provide('gf.graphics.VertexAttrib');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.webgl');



/**
 * A vertex array object, declaring vertex attribute bindings and state.
 * This object will use native vertex array objects if supported, and otherwise
 * fallback to an emulation that will attempt to reduce WebGL state changes.
 *
 * If possible, try setting all vertex attribute bindings with VAOs to ensure
 * the least possible redundant state settings.
 *
 * The semantics of this type closely match that of the OpenGL
 * OES_vertex_array_object extension, only it is designed to be immutable to
 * enable some performance improvements. It does not derive from
 * {@see gf.graphics.Resource} because it is not possible to fully restore the
 * state, and as such should be disposed and recreated by the code that creates
 * it.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {!Array.<!gf.graphics.VertexAttrib>} attributes Vertex attributes.
 * @param {WebGLBuffer} elementArrayBuffer Element array buffer, if any.
 */
gf.graphics.VertexArrayObject = function(graphicsContext,
    attributes, elementArrayBuffer) {
  goog.base(this);

  var gl = graphicsContext.gl;
  goog.asserts.assert(gl);

  /**
   * WebGL context.
   * @type {!WebGLRenderingContext}
   */
  this.gl = gl;

  /**
   * Vertex attributes, tightly packed and in no specific order.
   * @private
   * @type {!Array.<!gf.graphics.VertexAttrib>}
   */
  this.attributeList_ = attributes;

  /**
   * Vertex attributes, indexed by proper attribute index.
   * @private
   * @type {!Array.<gf.graphics.VertexAttrib>}
   */
  this.attributes_ = new Array(32);

  /**
   * Bitmask of enabled attributes.
   * @private
   * @type {number}
   */
  this.enabledAttributes_ = 0;

  // Setup attribute list and bitmask
  for (var n = 0; n < attributes.length; n++) {
    var attrib = attributes[n];
    this.attributes_[attrib.index] = attrib;
    this.enabledAttributes_ |= 1 << attrib.index;
  }

  /**
   * Element array buffer, if any.
   * @private
   * @type {WebGLBuffer}
   */
  this.elementArrayBuffer_ = elementArrayBuffer;

  /**
   * VAO extension object, if supported.
   * @private
   * @type {OES_vertex_array_object}
   */
  this.ext_ = graphicsContext.extensions.get_OES_vertex_array_object();

  /**
   * Native VAO handle.
   * @private
   * @type {WebGLVertexArrayObjectOES}
   */
  this.vao_ = null;

  // Setup the native VAO, if supported
  if (this.ext_) {
    this.vao_ = this.ext_.createVertexArrayOES();
    this.ext_.bindVertexArrayOES(this.vao_);
    // Run emulated setting code while bound to capture all state
    this.makeActiveFull_();
    // Always unbind so future random settings don't mess with it
    this.ext_.bindVertexArrayOES(null);
  }
};
goog.inherits(gf.graphics.VertexArrayObject, goog.Disposable);


/**
 * @override
 */
gf.graphics.VertexArrayObject.prototype.disposeInternal = function() {
  // Delete the native VAO
  if (this.ext_) {
    this.ext_.deleteVertexArrayOES(this.vao_);
    this.vao_ = null;
  }
  this.ext_ = null;

  goog.base(this, 'disposeInternal');
};


/**
 * Makes the VAO active.
 * If a previous VAO is provided then only the changed state will be set.
 * @param {gf.graphics.VertexArrayObject=} opt_previousVAO Previous VAO.
 */
gf.graphics.VertexArrayObject.prototype.makeActive = function(opt_previousVAO) {
  if (this == opt_previousVAO) {
    return;
  } else if (this.ext_) {
    // Native VAO support - rebind
    this.ext_.bindVertexArrayOES(this.vao_);
  } else if (opt_previousVAO) {
    // Emulated support with previous state, apply only delta
    this.makeActiveDelta_(opt_previousVAO);
  } else {
    // Emulated support with no previous state, reapply all
    this.makeActiveFull_();
  }
};


/**
 * Resets the VAO binding.
 */
gf.graphics.VertexArrayObject.prototype.reset = function() {
  if (this.ext_) {
    this.ext_.bindVertexArrayOES(null);
  }
};


/**
 * Makes the VAO active, reassigning all state.
 * @private
 */
gf.graphics.VertexArrayObject.prototype.makeActiveFull_ = function() {
  var gl = this.gl;

  gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, this.elementArrayBuffer_);

  var buffer = null;
  for (var n = 0; n < this.attributeList_.length; n++) {
    var attrib = this.attributeList_[n];
    gl.enableVertexAttribArray(attrib.index);
    if (buffer != attrib.buffer) {
      buffer = attrib.buffer;
      gl.bindBuffer(goog.webgl.ARRAY_BUFFER, attrib.buffer);
    }
    gl.vertexAttribPointer(
        attrib.index, attrib.size, attrib.type, attrib.normalized,
        attrib.stride, attrib.offset);
  }

  // It's a good idea to disable unused vertex attrib arrays, as WebGL
  // has tighter validation on draws than OpenGL, however it's fairly
  // expensive. Instead, let's just hope that callers are smart and don't
  // enable vertex attribs with no buffers.
  // gl.disableVertexAttribArray(n);
};


/**
 * Makes the VAO active, assigning only changed state from the previous VAO.
 * @private
 * @param {!gf.graphics.VertexArrayObject} previousVAO Previous VAO.
 */
gf.graphics.VertexArrayObject.prototype.makeActiveDelta_ =
    function(previousVAO) {
  var gl = this.gl;

  if (this.elementArrayBuffer_ != previousVAO.elementArrayBuffer_) {
    gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, this.elementArrayBuffer_);
  }

  var buffer = null;
  for (var n = 0; n < this.attributeList_.length; n++) {
    var attrib = this.attributeList_[n];

    // Enable only if not previously enabled
    // NOTE: this is not as good as it could be, as it will only go off of the
    // previous VAO, not the global GL state. It will result in additional calls
    // but will be safer and requires less global state tracking.
    if (!(previousVAO.enabledAttributes_ & (1 << attrib.index))) {
      gl.enableVertexAttribArray(attrib.index);
    }

    // Check to see if it matches the existing attribute
    var oldAttrib = previousVAO.attributes_[attrib.index];
    if (oldAttrib && oldAttrib.cacheKey == attrib.cacheKey) {
      // Same! Don't update
      continue;
    }

    // Update
    if (buffer != attrib.buffer) {
      buffer = attrib.buffer;
      gl.bindBuffer(goog.webgl.ARRAY_BUFFER, attrib.buffer);
    }
    gl.vertexAttribPointer(
        attrib.index, attrib.size, attrib.type, attrib.normalized,
        attrib.stride, attrib.offset);
  }
};



/**
 * A vertex attribute definition in a VAO referencing a buffer.
 *
 * @constructor
 * @param {number} index Attribute index.
 * @param {WebGLBuffer} buffer Buffer providing the data.
 * @param {number} size Number of components.
 * @param {number} type Component type.
 * @param {boolean} normalized Whether to normalize data.
 * @param {number} stride Stride, in bytes.
 * @param {number} offset Offset, in bytes.
 */
gf.graphics.VertexAttrib = function(
    index, buffer, size, type, normalized, stride, offset) {
  /**
   * Attribute index.
   * @type {number}
   */
  this.index = index;

  /**
   * Buffer providing the data.
   * @type {WebGLBuffer}
   */
  this.buffer = buffer;

  /**
   * Number of components in the attribute data.
   * @type {number}
   */
  this.size = size;

  /**
   * Attribute component type.
   * @type {number}
   */
  this.type = type;

  /**
   * Whether the attribute data is to be normalized.
   * @type {boolean}
   */
  this.normalized = normalized;

  /**
   * Stride of each attribute index, in bytes.
   * @type {number}
   */
  this.stride = stride;

  /**
   * Offset into the buffer to begin at, in bytes.
   * @type {number}
   */
  this.offset = offset;

  /**
   * A string value that can be used for quick comparison, unique to a buffer
   * attrib with specific settings.
   * @type {string}
   */
  this.cacheKey = [this.index, goog.getUid(this.buffer), this.size, this.type,
        this.normalized, this.stride, this.offset].join(':');
};
