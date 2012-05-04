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

goog.provide('gf.input.InputSource');

goog.require('goog.events.EventHandler');



/**
 * Base input source type.
 *
 * @constructor
 * @extends {goog.events.EventHandler}
 * @param {!Element} inputElement Root DOM input element.
 */
gf.input.InputSource = function(inputElement) {
  goog.base(this);

  /**
   * Root DOM input element.
   * @type {!Element}
   */
  this.inputElement = inputElement;

  /**
   * Whether the input source is enabled.
   * @type {boolean}
   */
  this.enabled = true;
};
goog.inherits(gf.input.InputSource, goog.events.EventHandler);


/**
 * Resets all delta values after a successful polling of an input source.
 */
gf.input.InputSource.prototype.resetDeltas = goog.nullFunction;


/**
 * Toggles the enable state of the input source.
 * @param {boolean} value Whether the input source should be enabled.
 */
gf.input.InputSource.prototype.setEnabled = function(value) {
  this.enabled = value;
};
