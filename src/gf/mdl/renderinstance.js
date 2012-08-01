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

goog.provide('gf.mdl.RenderInstance');

goog.require('gf.mdl.Instance');
goog.require('goog.webgl');



/**
 * An instance of a model that can be rendered.
 *
 * @constructor
 * @extends {gf.mdl.Instance}
 * @param {!gf.mdl.RenderModel} model Model this instance represents.
 */
gf.mdl.RenderInstance = function(model) {
  goog.base(this, model);

  /**
   * Graphics context.
   * @private
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext_ = model.getGraphicsContext();

  /**
   * Geometry resource, not owned.
   * @private
   * @type {!gf.mdl.GeometryResource}
   */
  this.geometryResource_ = model.getGeometryResource();
};
goog.inherits(gf.mdl.RenderInstance, gf.mdl.Instance);


/**
 * Renders the instance.
 * @param {!goog.vec.Mat4.Float32} transform Instance world transform.
 */
gf.mdl.RenderInstance.prototype.render = function(transform) {
  var ctx = this.graphicsContext_;
  var gl = ctx.getGL();

  // Setup geometry
  this.geometryResource_.bind();

  // Draw
  var parts = this.model.getParts();
  for (var n = 0; n < parts.length; n++) {
    var part = parts[n];

    // Set program
    // TODO(benvanik): set program, transform, and any material uniforms

    // Draw
    gl.drawElements(
        part.primitiveType,
        part.elementCount,
        goog.webgl.UNSIGNED_SHORT,
        part.elementOffset);
  }
};
