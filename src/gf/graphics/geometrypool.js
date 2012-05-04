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

goog.provide('gf.graphics.GeometryPool');

goog.require('gf.graphics.Resource');
goog.require('goog.asserts');
goog.require('goog.webgl');



/**
 * Dynamic geometry pool.
 * A basic pool of fixed-size geometry entries that can efficiently allocate/
 * deallocate entries.
 *
 * TODO(benvanik): shrink
 * TODO(benvanik): compact? (reorder/etc)
 *
 * @constructor
 * @extends {gf.graphics.Resource}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {number} slotSize Slot size, in bytes.
 * @param {number=} opt_defaultSlotCapacity Default slot capacity.
 * @param {number=} opt_capacityGrowthRate Number of slots to grow by when the
 *     buffer is full.
 */
gf.graphics.GeometryPool = function(graphicsContext, slotSize,
    opt_defaultSlotCapacity, opt_capacityGrowthRate) {
  goog.base(this, graphicsContext);

  /**
   * Slot size, in bytes.
   * @protected
   * @type {number}
   */
  this.slotSize = slotSize;

  /**
   * Current slot capacity in the buffer.
   * @private
   * @type {number}
   */
  this.slotCapacity_ = goog.isDef(opt_defaultSlotCapacity) ?
      opt_defaultSlotCapacity : gf.graphics.GeometryPool.CAPACITY_DEFAULT_;

  /**
   * Number of slots to grow by when the buffer is full.
   * @private
   * @type {number}
   */
  this.growthRate_ = goog.isDef(opt_capacityGrowthRate) ?
      opt_capacityGrowthRate : gf.graphics.GeometryPool.CAPACITY_GROWTH_RATE_;

  /**
   * Geometry data.
   * @protected
   * @type {!ArrayBuffer}
   */
  this.slotData = new ArrayBuffer(this.slotCapacity_ * this.slotSize);

  /**
   * WebGL vertex buffer resource.
   * May be null if not yet loaded or discarded.
   * @private
   * @type {WebGLBuffer}
   */
  this.buffer_ = null;

  /**
   * Current highwater slot.
   * @protected
   * @type {number}
   */
  this.slotMax = 0;

  /**
   * Indices of unused slots.
   * @private
   * @type {!Array.<number>}
   */
  this.unusedSlots_ = [];

  /**
   * Whether the buffer needs to be reuploaded.
   * @private
   * @type {boolean}
   */
  this.needsUpload_ = false;

  /**
   * The minimum slot index that needs to be uploaded, or MAX_VALUE for all.
   * @private
   * @type {number}
   */
  this.uploadMinSlot_ = Number.MAX_VALUE;

  /**
   * The maximum slot index that needs to be uploaded, or MIN_VALUE for all.
   * @private
   * @type {number}
   */
  this.uploadMaxSlot_ = Number.MIN_VALUE;
};
goog.inherits(gf.graphics.GeometryPool, gf.graphics.Resource);


/**
 * Invalid slot identifier.
 * @const
 * @type {number}
 */
gf.graphics.GeometryPool.INVALID_SLOT = 0xFFFF;


/**
 * Default slot capacity for new buffers.
 * @private
 * @const
 * @type {number}
 */
gf.graphics.GeometryPool.CAPACITY_DEFAULT_ = 16;


/**
 * Number of slots to expand the data by when required.
 * TODO(benvanik): tune this value, or find a way to measure waste
 * @private
 * @const
 * @type {number}
 */
gf.graphics.GeometryPool.CAPACITY_GROWTH_RATE_ = 32;


/**
 * @override
 */
gf.graphics.GeometryPool.prototype.discard = function() {
  var gl = this.graphicsContext.gl;

  // Delete buffer
  gl.deleteBuffer(this.buffer_);
  this.buffer_ = null;

  // Mark dirty
  this.needsUpload_ = true;
  this.uploadMinSlot_ = Number.MIN_VALUE;
  this.uploadMaxSlot_ = Number.MAX_VALUE;

  goog.base(this, 'discard');
};


/**
 * @override
 */
gf.graphics.GeometryPool.prototype.restore = function() {
  var gl = this.graphicsContext.gl;

  goog.base(this, 'restore');

  // Create buffer again
  goog.asserts.assert(!this.buffer_);
  this.buffer_ = gl.createBuffer();

  // Mark dirty
  this.needsUpload_ = true;
  this.uploadMinSlot_ = Number.MIN_VALUE;
  this.uploadMaxSlot_ = Number.MAX_VALUE;

  // Reupload
  this.prepareDraw();
};


/**
 * Ensures that there are at least the given number of slots available, and
 * expands the pool for them.
 * Using this can make things more efficient when adding large numbers of
 * items to the pool.
 * @param {number} newSlotCount Number of new slots being added.
 * @return {boolean} True if the expansion succeeded.
 */
gf.graphics.GeometryPool.prototype.ensureCapacity = function(newSlotCount) {
  var newCapacity = Math.max(this.slotCapacity_, this.slotMax + newSlotCount);
  if (newCapacity > this.slotCapacity_) {
    return this.expand_(newCapacity);
  } else {
    return true;
  }
};


/**
 * Expands the slot buffer to support more slots.
 * @private
 * @param {number=} opt_newCapacity New capacity, in slots.
 * @return {boolean} True if the expansion succeeded.
 */
gf.graphics.GeometryPool.prototype.expand_ = function(opt_newCapacity) {
  var newCapacity = opt_newCapacity || (this.slotCapacity_ + this.growthRate_);
  if (newCapacity >= gf.graphics.GeometryPool.INVALID_SLOT) {
    return false;
  }

  var newData = new ArrayBuffer(newCapacity * this.slotSize);

  // Ghetto clone
  // TODO(benvanik): optimize somehow?
  var byteWrapper = new Uint8Array(newData);
  byteWrapper.set(new Uint8Array(this.slotData));

  this.slotCapacity_ = newCapacity;
  this.slotData = newData;

  // Dirty everything
  this.needsUpload_ = true;
  this.uploadMinSlot_ = Number.MIN_VALUE;
  this.uploadMaxSlot_ = Number.MAX_VALUE;

  // Let subclasses do anything they need to do now that the buffer has been
  // reset
  this.dataBufferChanged();

  return true;
};


/**
 * Allocates a new slot with enough space for one item.
 * @protected
 * @return {number} Slot, or {@see gf.graphics.GeometryPool.INVALID_SLOT} if an
 *     error occurred.
 */
gf.graphics.GeometryPool.prototype.allocateSlot = function() {
  // Pick a slot to use
  var slot = 0;
  if (this.unusedSlots_.length) {
    slot = this.unusedSlots_.pop();
  } else {
    slot = this.slotMax++;
  }

  // Expand, if needed
  while (slot >= this.slotCapacity_) {
    if (!this.expand_()) {
      return gf.graphics.GeometryPool.INVALID_SLOT;
    }
  }

  // Dirty region
  this.needsUpload_ = true;
  this.uploadMinSlot_ = Math.min(this.uploadMinSlot_, slot);
  this.uploadMaxSlot_ = Math.max(this.uploadMaxSlot_, slot);

  return slot;
};


/**
 * Marks a slot as being dirty and needing upload.
 * @protected
 * @param {number} slot Previously assigned slot.
 */
gf.graphics.GeometryPool.prototype.invalidateSlot = function(slot) {
  // Dirty region
  this.needsUpload_ = true;
  this.uploadMinSlot_ = Math.min(this.uploadMinSlot_, slot);
  this.uploadMaxSlot_ = Math.max(this.uploadMaxSlot_, slot);
};


/**
 * Deallocates a previously-allocated slot.
 * @protected
 * @param {number} slot Slot to return to the pool.
 */
gf.graphics.GeometryPool.prototype.deallocateSlot = function(slot) {
  if (slot == this.slotMax) {
    // Shrinking - no need to update data
    this.slotMax--;
  } else {
    // Deallocating slot - return to pool
    this.unusedSlots_.push(slot);

    // Dirty region
    this.needsUpload_ = true;
    this.uploadMinSlot_ = Math.min(this.uploadMinSlot_, slot);
    this.uploadMaxSlot_ = Math.max(this.uploadMaxSlot_, slot);
  }

  // TODO(benvanik): compact if getting too sparse
  // TODO(benvanik): shrink if getting too big
};


/**
 * Quickly resets all of the data in the pool.
 * @param {boolean=} opt_shrink Shrink the pool data buffers.
 */
gf.graphics.GeometryPool.prototype.clear = function(opt_shrink) {
  this.slotMax = 0;
  this.unusedSlots_.length = 0;
  this.needsUpload_ = false;
  this.uploadMinSlot_ = Number.MAX_VALUE;
  this.uploadMaxSlot_ = Number.MIN_VALUE;

  // TODO(benvanik): shrink
};


/**
 * Prepares the underlying data before a draw.
 * @protected
 */
gf.graphics.GeometryPool.prototype.prepareDraw = function() {
  var gl = this.graphicsContext.gl;

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);

  // Upload, if required
  if (this.needsUpload_) {
    // TODO(benvanik): subregion upload
    gl.bufferData(goog.webgl.ARRAY_BUFFER, this.slotData,
        goog.webgl.DYNAMIC_DRAW);
    this.needsUpload_ = false;
    this.uploadMinSlot_ = Number.MAX_VALUE;
    this.uploadMaxSlot_ = Number.MIN_VALUE;
  }
};


/**
 * Allows subclasses to reset pointers when underlying data buffers change.
 * @protected
 */
gf.graphics.GeometryPool.prototype.dataBufferChanged = goog.nullFunction;
