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

goog.provide('gf.Runtime');

goog.require('gf');
/** @suppress {extraRequire} */
goog.require('gf.Component');
goog.require('gf.assets.BuildClient');
goog.require('gf.timing.Clock');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Core runtime instance.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.LaunchOptions} launchOptions Game options.
 * @param {gf.timing.Clock=} opt_clock Clock to use for time values.
 */
gf.Runtime = function(launchOptions, opt_clock) {
  goog.base(this);

  /**
   * Game options.
   * @type {!gf.LaunchOptions}
   */
  this.launchOptions = launchOptions;

  /**
   * Synchronized clock.
   * @type {!gf.timing.Clock}
   */
  this.clock = opt_clock || new gf.timing.Clock();

  /**
   * All registered components.
   * @type {!Array.<!gf.Component>}
   */
  this.components = [];

  /**
   * Build daemon client.
   * This will only be initialized if running with {@see gf.BUILD_CLIENT} set to
   * true and {@see gf.LaunchOptions#buildServer} is defined.
   * @type {gf.assets.BuildClient}
   */
  this.buildClient = null;
  if (gf.BUILD_CLIENT && launchOptions.buildServer) {
    this.buildClient = new gf.assets.BuildClient(this);
    this.registerDisposable(this.buildClient);
  }
};
goog.inherits(gf.Runtime, goog.Disposable);


/**
 * @override
 */
gf.Runtime.prototype.disposeInternal = function() {
  // Dispose all components
  goog.disposeAll(this.components);
  this.components.length = 0;

  goog.base(this, 'disposeInternal');
};


/**
 * Adds a new component to the runtime.
 * @param {!gf.Component} component Component to add.
 */
gf.Runtime.prototype.addComponent = function(component) {
  goog.asserts.assert(!goog.array.contains(this.components, component));
  this.components.push(component);
};


/**
 * Removes an existing component from the runtime.
 * @param {!gf.Component} component Component to remove.
 */
gf.Runtime.prototype.removeComponent = function(component) {
  goog.array.remove(this.components, component);
};


/**
 * Gets the current game time.
 * @return {number} Game time, in seconds.
 */
gf.Runtime.prototype.getTime = function() {
  return this.clock.getServerTime();
};
