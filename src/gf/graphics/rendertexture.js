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

goog.provide('gf.graphics.RenderTexture');

goog.require('gf.graphics.Texture');



/**
 * A texture that can be sampled from as well as bound as a render target.
 *
 * @constructor
 * @extends {gf.graphics.Texture}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {number} width Texture width, in pixels.
 * @param {number} height Texture height, in pixels.
 * @param {number} format Texture format (one of RGB/RGBA/etc).
 */
gf.graphics.RenderTexture = function(graphicsContext,
    width, height, format) {
  goog.base(this, graphicsContext, width, height, format);
};
goog.inherits(gf.graphics.RenderTexture, gf.graphics.Texture);


/**
 * @override
 */
gf.graphics.RenderTexture.prototype.discard = function() {
  var gl = this.graphicsContext.gl;

  // TODO(benvanik): drop framebuffer/renderbuffer/etc

  goog.base(this, 'discard');
};


/**
 * @override
 */
gf.graphics.RenderTexture.prototype.restore = function() {
  var gl = this.graphicsContext.gl;

  goog.base(this, 'restore');

  // TODO(benvanik): recreate
};
