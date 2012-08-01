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

goog.provide('gf.mdl.Library');

goog.require('goog.Disposable');



/**
 * Abstract library of models that can be used to create new instances.
 * Models are registered with the library with enough information to create them
 * on demand. This enables many models to be registered on startup and then
 * created as needed.
 *
 * Subclasses define how models are registered and created. This base type
 * handles the caching of loaded models and creation of instances.
 *
 * @constructor
 * @extends {goog.Disposable}
 */
gf.mdl.Library = function() {
  goog.base(this);

  // TODO(benvanik): add caching info (ref count, last use time, etc)
  /**
   * Loaded models, mapped by model ID.
   * @type {!Object.<!gf.mdl.Model>}
   */
  this.models_ = {};
};
goog.inherits(gf.mdl.Library, goog.Disposable);


/**
 * @override
 */
gf.mdl.Library.prototype.disposeInternal = function() {
  // Unload all models
  for (var modelId in this.models_) {
    var model = this.models_[modelId];
    goog.dispose(model);
  }
  this.models_ = {};

  goog.base(this, 'disposeInternal');
};


/**
 * Updates the library, allowing cache management routines to run
 * @param {!gf.UpdateFrame} frame Update frame.
 */
gf.mdl.Library.prototype.update = function(frame) {
  // TODO(benvanik): cache management (LRU/etc)
};


/**
 * Creates a new model instance.
 * @param {string} modelId Model ID.
 * @return {gf.mdl.Instance} New model instance, if the model was found.
 */
gf.mdl.Library.prototype.createModelInstance = function(modelId) {
  // Attempt to get the model
  var model = this.models_[modelId];
  if (!model) {
    // Create the model
    model = this.createModel(modelId);
    if (!model) {
      return null;
    }

    this.models_[modelId] = model;
  }

  // Create an instance
  return model.createInstance();
};


/**
 * Creates a model by ID.
 * @protected
 * @param {string} modelId Model ID.
 * @return {gf.mdl.Model} Data model, if found.
 */
gf.mdl.Library.prototype.createModel = goog.abstractMethod;
