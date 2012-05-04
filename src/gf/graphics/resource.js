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

goog.provide('gf.graphics.Resource');

goog.require('goog.Disposable');



/**
 * Base resource type.
 * Handles registration with the graphics context. All resources that have
 * graphics data should derive from this type to properly handle context
 * loss/restore.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 */
gf.graphics.Resource = function(graphicsContext) {
  goog.base(this);

  /**
   * Target graphics context.
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext = graphicsContext;

  /**
   * Unique resource ID that can be used for maps.
   * @type {string}
   */
  this.resourceId = String(gf.graphics.Resource.nextResourceId_++);

  // Register
  this.graphicsContext.registerResource(this);
};
goog.inherits(gf.graphics.Resource, goog.Disposable);


/**
 * @override
 */
gf.graphics.Resource.prototype.disposeInternal = function() {
  // Unregister
  this.graphicsContext.unregisterResource(this);

  // Always discard
  this.discard();

  goog.base(this, 'disposeInternal');
};


/**
 * Next unique resource ID. Incremented on resource creation.
 * @private
 * @type {number}
 */
gf.graphics.Resource.nextResourceId_ = 0;


/**
 * Discards the resource when the context is lost.
 */
gf.graphics.Resource.prototype.discard = goog.nullFunction;


/**
 * Restores the resource after a context loss.
 */
gf.graphics.Resource.prototype.restore = goog.nullFunction;
