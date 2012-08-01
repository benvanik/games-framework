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


// TODO(benvanik): render
/**
 *
 */
gf.mdl.RenderInstance.prototype.render = function() {
};
