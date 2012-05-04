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

goog.provide('gf.graphics.BitmapFont');

goog.require('gf.graphics.Resource');
goog.require('goog.vec.Vec4');



/**
 * Simple bitmapped font.
 *
 * @constructor
 * @extends {gf.graphics.Resource}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {!gf.graphics.TextureAtlas} atlas Texture atlas.
 * @param {number} lineHeight Line height, in px.
 * @param {!Array.<number|string>} glyphData Glyph data, in the form of
 *     [character, a, b, c, character, a, b, c, ...].
 */
gf.graphics.BitmapFont = function(graphicsContext, atlas, lineHeight,
    glyphData) {
  goog.base(this, graphicsContext);

  /**
   * Texture atlas.
   * @type {!gf.graphics.TextureAtlas}
   */
  this.atlas = atlas;

  /**
   * Height of a line.
   * @type {number}
   */
  this.lineHeight = lineHeight;

  /**
   * Vertical spacing between lines.
   * @type {number}
   */
  this.lineSpacing = 2;

  /**
   * Horizontal spacing between characters.
   * @type {number}
   */
  this.charSpacing = 2;

  /**
   * All glyphs, indexed by character code.
   * @type {!Array.<!gf.graphics.BitmapFont.Glyph>}
   */
  this.glyphs = [];

  // Load glyph data
  for (var n = 0; n < glyphData.length; n += 4) {
    var character = glyphData[n];
    var index = 0;
    if (character.length) {
      index = character.charCodeAt(0);
    } else {
      index = /** @type {number} */ (character);
      character = String.fromCharCode(index);
    }
    var a = /** @type {number} */ (glyphData[n + 1]);
    var b = /** @type {number} */ (glyphData[n + 2]);
    var c = /** @type {number} */ (glyphData[n + 3]);
    var texCoords = atlas.getSlotCoords(n / 4, goog.vec.Vec4.createFloat32());
    this.glyphs[index] = new gf.graphics.BitmapFont.Glyph(
        /** @type {string} */ (character), a, b, c, texCoords);
  }
};
goog.inherits(gf.graphics.BitmapFont, gf.graphics.Resource);


/**
 * Measures the width and height of a string.
 * @param {string} value String to measure.
 * @return {!Array.<number>} String width and height.
 */
gf.graphics.BitmapFont.prototype.measureString = function(value) {
  var x = 0;
  var maxX = 0;
  var y = 0;
  var h = 0;
  var firstChar = true;
  var lastC = 0;
  for (var n = 0; n < value.length; n++) {
    var c = value[n];

    // Ignore invalid chars
    if (c == '\r') {
      continue;
    }

    // Newline
    if (c == '\n') {
      maxX = Math.max(x + lastC, maxX);
      x = 0;
      lastC = 0;
      y += this.lineHeight + this.lineSpacing;
      h += this.lineSpacing;
      firstChar = true;
      continue;
    }

    // Get glyph - if not found, skip
    var glyph = this.glyphs[c.charCodeAt(0)];
    if (!glyph) {
      continue;
    }

    // Renderable character
    if (!firstChar) {
      x += this.charSpacing + lastC;
    } else {
      h = Math.max(h, this.lineHeight);
    }
    lastC = glyph.c;
    x += glyph.a + glyph.b;
    firstChar = false;
  }
  maxX = Math.max(x + lastC, maxX);

  return [maxX, h];
};


/**
 * Adds string glyphs to the given buffer.
 * @param {!gf.graphics.SpriteBuffer} spriteBuffer Sprite buffer.
 * @param {string} value String to prepare.
 * @param {number} color 32-bit ABGR color.
 * @param {number} dx Offset X.
 * @param {number} dy Offset Y.
 * @param {number=} opt_depth Destination depth.
 * @return {!Array.<number>} String width and height.
 */
gf.graphics.BitmapFont.prototype.prepareString = function(spriteBuffer, value,
    color, dx, dy, opt_depth) {
  // Quick resize to fit the string
  spriteBuffer.ensureCapacity(value.length);

  var tx = 1 / this.atlas.width;
  var ty = 1 / this.atlas.height;

  var x = 0;
  var maxX = 0;
  var y = 0;
  var h = 0;
  var firstChar = true;
  var lastC = 0;
  for (var n = 0; n < value.length; n++) {
    var c = value[n];

    // Ignore invalid chars
    if (c == '\r') {
      continue;
    }

    // Newline
    if (c == '\n') {
      maxX = Math.max(x + lastC, maxX);
      x = 0;
      lastC = 0;
      y += this.lineHeight + this.lineSpacing;
      h += this.lineSpacing;
      firstChar = true;
      continue;
    }

    // Get glyph - if not found, skip
    var glyph = this.glyphs[c.charCodeAt(0)];
    if (!glyph) {
      continue;
    }

    // Renderable character
    if (!firstChar) {
      x += this.charSpacing + lastC;
    } else {
      h = Math.max(h, this.lineHeight);
    }
    lastC = glyph.c;
    x += glyph.a;

    // Draw at x, y
    var sx = glyph.texCoords[0];
    var sy = glyph.texCoords[1];
    var sw = glyph.b * tx;
    var sh = this.lineHeight * ty;
    spriteBuffer.add(
        sx, sy,
        sw, sh,
        color,
        dx + x, dy + y,
        glyph.b, this.lineHeight);

    x += glyph.b;
    firstChar = false;
  }
  maxX = Math.max(x + lastC, maxX);

  return [maxX, h];
};



/**
 * A single glyph in the font.
 *
 * @constructor
 * @param {string} character Character value.
 * @param {number} a Kerning pre-character.
 * @param {number} b Kerning character width.
 * @param {number} c Kerning post-character.
 * @param {!goog.vec.Vec4.Type} texCoords Atlas texture coordaintes.
 */
gf.graphics.BitmapFont.Glyph = function(character, a, b, c, texCoords) {
  /**
   * The character this glyph represents.
   * @type {string}
   */
  this.character = character;

  /**
   * +x before drawing the glyph.
   * @type {number}
   */
  this.a = a;

  /**
   * +x of visible glyph portion.
   * @type {number}
   */
  this.b = b;

  /**
   * +x for whitespace after drawing the glyph.
   * @type {number}
   */
  this.c = c;

  /**
   * Texture source texture coordinates.
   * @type {!goog.vec.Vec4.Type}
   */
  this.texCoords = texCoords;
};
