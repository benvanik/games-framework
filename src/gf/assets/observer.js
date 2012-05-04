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

goog.provide('gf.assets.Observer');



/**
 * An interface for observers of asset change notifications.
 *
 * @interface
 */
gf.assets.Observer = function() {};


/**
 * Notifies an observer that a list of assets changed.
 * Each asset is listed by the tracking tag defined by the build task that
 * generates it.
 * @param {!Array.<string>} tags Asset tags.
 */
gf.assets.Observer.prototype.notifyAssetsChanged = goog.nullFunction;
