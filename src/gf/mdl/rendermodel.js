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

goog.provide('gf.mdl.RenderModel');
goog.provide('gf.mdl.RenderModelCreateFunction');

goog.require('gf.mdl.GeometryResource');
goog.require('gf.mdl.Model');
goog.require('gf.mdl.RenderInstance');
goog.require('goog.asserts');


/**
 * A function that creates a model.
 * @typedef {function(!gf.assets.AssetManager, !gf.graphics.GraphicsContext):
 *     !gf.mdl.Model}
 */
gf.mdl.RenderModelCreateFunction;



/**
 * A model that can be rendered.
 *
 * @constructor
 * @extends {gf.mdl.Model}
 * @param {string} modelId Model ID.
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 */
gf.mdl.RenderModel = function(modelId, graphicsContext) {
  goog.base(this, modelId);

  /**
   * Graphics context.
   * @private
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext_ = graphicsContext;

  /**
   * Geometry resource, initialized when data is set.
   * @private
   * @type {gf.mdl.GeometryResource}
   */
  this.geometryResource_ = null;

  // TODO(benvanik): render part list
  // TODO(benvanik): cached optimized render plan?
};
goog.inherits(gf.mdl.RenderModel, gf.mdl.Model);


/**
 * Gets the graphics context.
 * @return {!gf.graphics.GraphicsContext} Graphics context.
 */
gf.mdl.RenderModel.prototype.getGraphicsContext = function() {
  return this.graphicsContext_;
};


/**
 * Gets the geometry resource.
 * @return {!gf.mdl.GeometryResource} Geometry resource.
 */
gf.mdl.RenderModel.prototype.getGeometryResource = function() {
  goog.asserts.assert(this.geometryResource_);
  return this.geometryResource_;
};


/**
 * @override
 */
gf.mdl.RenderModel.prototype.setGeometryData = function(value) {
  goog.base(this, 'setGeometryData', value);

  // Setup the GPU geometry resource
  goog.asserts.assert(!this.geometryResource_);
  this.geometryResource_ = new gf.mdl.GeometryResource(
      this.graphicsContext_, value);
  this.registerDisposable(this.geometryResource_);

  // TODO(benvanik): is this the right place to do this?
  this.geometryResource_.restore();
};


/**
 * @override
 */
gf.mdl.RenderModel.prototype.createInstance = function() {
  return new gf.mdl.RenderInstance(this);
};
