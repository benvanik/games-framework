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

goog.provide('gf.assets.AssetLoader');

goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');



/**
 * Base type for asset loaders.
 *
 * @constructor
 * @extends {goog.Disposable}
 */
gf.assets.AssetLoader = function() {
  goog.base(this);

  /**
   * Event handler used to listen for load events.
   * @protected
   * @type {goog.events.EventHandler}
   */
  this.eh = new goog.events.EventHandler(this);
  this.registerDisposable(this.eh);
};
goog.inherits(gf.assets.AssetLoader, goog.Disposable);


/**
 * Begins loading the asset.
 * @param {!goog.async.Deferred} deferred A deferred fulfilled when the load has
 *     completed. Successful callbacks receive the asset content as their
 *     argument.
 */
gf.assets.AssetLoader.prototype.load = function(deferred) {
  deferred.callback(null);
};


/**
 * Cancels an in-progress load.
 */
gf.assets.AssetLoader.prototype.cancel = goog.nullFunction;
