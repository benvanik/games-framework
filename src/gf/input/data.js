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

goog.provide('gf.input.Data');



/**
 * Input data storage.
 * Allocate one of these and reuse it across frames.
 *
 * @constructor
 * @param {!gf.input.InputManager} inputManager Source for input data.
 */
gf.input.Data = function(inputManager) {
  /**
   * Input manager.
   * @private
   * @type {!gf.input.InputManager}
   */
  this.inputManager_ = inputManager;

  /**
   * Keyboard data, if available.
   * @type {gf.input.KeyboardData}
   */
  this.keyboard = null;

  /**
   * Mouse data, if available.
   * @type {gf.input.MouseData}
   */
  this.mouse = null;

  // /**
  //  * Touch data, if available.
  //  * @type {gf.input.TouchData}
  //  */
  // this.touch = null;

  // /**
  //  * Gamepad data, if available.
  //  * @type {gf.input.GamepadData}
  //  */
  // this.gamepad = null;
};


/**
 * Polls all input data.
 */
gf.input.Data.prototype.poll = function() {
  if (this.inputManager_.keyboard) {
    this.keyboard = this.inputManager_.keyboard.poll();
  } else {
    this.keyboard = null;
  }
  if (this.inputManager_.mouse) {
    this.mouse = this.inputManager_.mouse.poll();
  } else {
    this.mouse = null;
  }
  // TODO(benvanik): others
};


/**
 * Resets all input data after a frame.
 */
gf.input.Data.prototype.reset = function() {
  this.inputManager_.resetDeltas();
  this.keyboard = null;
  this.mouse = null;
  // this.touch = null;
  // this.gamepad = null;
};
