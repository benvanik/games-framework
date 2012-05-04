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

goog.provide('gf.assets.AssetManager');

goog.require('gf.Component');
goog.require('goog.async.Deferred');



/**
 * Shared asset manager.
 * Handles asset loading and reloading.
 *
 * @constructor
 * @extends {gf.Component}
 * @param {!gf.Runtime} runtime Current runtime.
 * @param {!goog.dom.DomHelper} dom DOM helper.
 */
gf.assets.AssetManager = function(runtime, dom) {
  goog.base(this, runtime);

  /**
   * DOM helper.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom;
};
goog.inherits(gf.assets.AssetManager, gf.Component);


/**
 * Begins loading the given asset.
 * Once the asset has loaded an {@see goog.events.EventType#LOAD} event will be
 * dispatched on the asset. Continue watching for the events even after the
 * initial load to support reloading.
 *
 * @param {!gf.assets.AssetLoader} assetLoader Asset loader.
 * @param {gf.assets.LoadPriority=} opt_priority Priority to load with. Defaults
 *     to {@see gf.assets.LoadPriority#NORMAL}.
 * @return {!goog.async.Deferred} A deferred fulfilled when the load completes.
 *     Successful callbacks will receive the content as their argument. The
 *     deferred should be cancelled if it is no longer needed.
 */
gf.assets.AssetManager.prototype.load = function(assetLoader, opt_priority) {
  var deferred = new goog.async.Deferred(function() {
    assetLoader.cancel();
  }, this);

  // TODO(benvanik): queue/etc
  assetLoader.load(deferred);

  return deferred;
};
