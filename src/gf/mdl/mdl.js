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

goog.provide('gf.mdl');
goog.provide('gf.mdl.ComponentType');
goog.provide('gf.mdl.PrimitiveType');


/**
 * Maximum bone count in a model.
 * Bones require 4 vertex shader uniform slots each, and as such are limited by
 * the GPU caps. WebGL requires at least 128 uniforms, and some (~16) are needed
 * by the rest of the shader.
 *
 * I've tried to pick a reasonable number that covers most platforms; at most
 * only 28 bones should be used to work everywhere. If some embedded devices
 * can be ignored then up to 60 bones can be used.
 *
 * Of course, bones also require javascript processing time - 60 bones means
 * 60 matrix multiples per instance per frame, which can get expensive. Keep
 * the bone count small!
 *
 * @const
 * @type {number}
 */
gf.mdl.MAX_BONES = 20;


/**
 * Maximum bone weights per vertex.
 * This defines how many bones may effect a single vertex. It should be a
 * multiple of 4. Each multiple of 4 requires a vertex attribute, of which there
 * is a very limited amount (~15-16), so this is kept low.
 *
 * Each additional weight does take more GPU processing time, so avoid setting
 * this too high to ensure the vertex pipeline stays fast.
 *
 * @const
 * @type {number}
 */
gf.mdl.MAX_WEIGHTS_PER_VERTEX = 4;


/**
 * Primitive type.
 * @enum {number}
 */
gf.mdl.PrimitiveType = {
  /**
   * Triangle list.
   * Represents {@see goog.webgl#TRIANGLES}.
   */
  TRIANGLES: 0x0004
};


/**
 * Attribute component type.
 * @enum {number}
 */
gf.mdl.ComponentType = {
  /**
   * 32-bit floating point number.
   * Like {@see goog.webgl#FLOAT}.
   */
  FLOAT: 0x1406
};
