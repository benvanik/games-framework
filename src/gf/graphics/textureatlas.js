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

goog.provide('gf.graphics.TextureAtlas');

goog.require('gf.graphics.LoadableTexture');
goog.require('goog.asserts');
goog.require('goog.vec.Vec4');



/**
 * A texture atlas that supports deferred loading.
 *
 * @constructor
 * @extends {gf.graphics.LoadableTexture}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {string} path Asset path.
 * @param {string} name Human-readable name for debugging.
 * @param {gf.graphics.ImageInfo=} opt_imageInfo Image metadata.
 */
gf.graphics.TextureAtlas = function(assetManager, graphicsContext, path, name,
    opt_imageInfo) {
  goog.base(this, assetManager, graphicsContext, path, name, opt_imageInfo);

  /**
   * Slot texture coordinates, indexed by slot index.
   * @private
   * @type {!Array.<!goog.vec.Vec4.Type>}
   */
  this.slots_ = [];
};
goog.inherits(gf.graphics.TextureAtlas, gf.graphics.LoadableTexture);


/**
 * Sets up square slots entries.
 * TODO(benvanik): make @protected when fonts are implemented correctly
 * @param {number} slotSize Size, in px, of each slot.
 */
gf.graphics.TextureAtlas.prototype.setupSquareSlots = function(slotSize) {
  goog.asserts.assert(this.imageInfo);

  var slotsWide = this.imageInfo.width / slotSize;
  var slotsHigh = this.imageInfo.height / slotSize;
  for (var y = 0, n = 0; y < slotsHigh; y++) {
    var ty = y / slotsHigh;
    for (var x = 0; x < slotsWide; x++, n++) {
      var tx = x / slotsWide;
      this.slots_[n] = goog.vec.Vec4.createFloat32FromValues(
          tx, ty, tx + 1 / slotsWide, ty + 1 / slotsHigh);
    }
  }
};


/**
 * Gets the texture coordinates of a given slot.
 * @param {number} index Slot index.
 * @param {!goog.vec.Vec4.Type} texCoords 4-element array receiving the
 *     texture coordinates as [tu0, tv0, tu1, tv1].
 * @return {!goog.vec.Vec4.Type} texCoords to enable chaining.
 */
gf.graphics.TextureAtlas.prototype.getSlotCoords = function(index, texCoords) {
  var coords = this.slots_[index];
  if (coords) {
    goog.vec.Vec4.setFromArray(texCoords, coords);
  }
  return texCoords;
};
