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

goog.provide('gf.mdl.RenderLibrary');

goog.require('gf.log');
goog.require('gf.mdl.Library');
goog.require('goog.asserts');



/**
 * An individual model type entry in the library.
 * @private
 * @typedef {{
 *   id: string,
 *   createFunction: !gf.mdl.RenderModelCreateFunction
 * }}
 */
gf.mdl.RenderLibraryEntry_;



/**
 * A library of models that can be used to create new instances.
 * Models are registered with the library with enough information to create them
 * on demand. This enables many models to be registered on startup and then
 * created as needed.
 *
 * @constructor
 * @extends {gf.mdl.Library}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 */
gf.mdl.RenderLibrary = function(assetManager, graphicsContext) {
  goog.base(this);

  /**
   * Asset manager.
   * @private
   * @type {!gf.assets.AssetManager}
   */
  this.assetManager_ = assetManager;

  /**
   * Graphics context.
   * @private
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext_ = graphicsContext;

  /**
   * Registered model types, mapped by model ID.
   * @type {!Object.<!gf.mdl.RenderLibraryEntry_>}
   */
  this.modelTypes_ = {};
};
goog.inherits(gf.mdl.RenderLibrary, gf.mdl.Library);


/**
 * Registers a model type.
 * @param {string} modelId Model ID.
 * @param {!gf.mdl.RenderModelCreateFunction} createFunction A function that
 *     creates a model.
 */
gf.mdl.RenderLibrary.prototype.registerModelType = function(
    modelId, createFunction) {
  goog.asserts.assert(!this.modelTypes_[modelId]);
  this.modelTypes_[modelId] = {
    id: modelId,
    createFunction: createFunction
  };
};


/**
 * @override
 */
gf.mdl.RenderLibrary.prototype.createModel = function(modelId) {
  var modelType = this.modelTypes_[modelId];
  if (!modelType) {
    // Model not found
    gf.log.debug('Model type ' + modelId + ' not found');
    return null;
  }
  return modelType.createFunction(this.assetManager_, this.graphicsContext_);
};
