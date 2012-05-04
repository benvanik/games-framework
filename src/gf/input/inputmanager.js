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

goog.provide('gf.input.InputManager');

goog.require('gf.Component');
goog.require('gf.input.GamepadSource');
goog.require('gf.input.KeyboardSource');
goog.require('gf.input.MouseSource');
goog.require('gf.input.TouchSource');



/**
 * Shared input manager.
 * Initializes, discovers, and handles the lifetime management of all input
 * sources.
 *
 * @constructor
 * @extends {gf.Component}
 * @param {!gf.Runtime} runtime Current runtime.
 * @param {!Element} inputElement Root DOM input element.
 */
gf.input.InputManager = function(runtime, inputElement) {
  goog.base(this, runtime);

  /**
   * Root DOM input element.
   * @type {!Element}
   */
  this.inputElement = inputElement;

  /**
   * Keyboard input source.
   * @type {gf.input.KeyboardSource}
   */
  this.keyboard = null;

  /**
   * Mouse input source.
   * @type {gf.input.MouseSource}
   */
  this.mouse = null;

  /**
   * Touch input source.
   * @type {gf.input.TouchSource}
   */
  this.touch = null;

  /**
   * Gamepad input source.
   * @type {gf.input.GamepadSource}
   */
  this.gamepad = null;

  // TODO(benvanik): detect keyboard
  this.keyboard = new gf.input.KeyboardSource(inputElement);
  this.registerDisposable(this.keyboard);

  // TODO(benvanik): detect mouse
  this.mouse = new gf.input.MouseSource(inputElement);
  this.registerDisposable(this.mouse);

  // TODO(benvanik): detect touch
  this.touch = new gf.input.TouchSource(inputElement);
  this.registerDisposable(this.touch);

  // TODO(benvanik): detect gamepad
  this.gamepad = new gf.input.GamepadSource(inputElement);
  this.registerDisposable(this.gamepad);
};
goog.inherits(gf.input.InputManager, gf.Component);


/**
 * Resets input data after it has been used.
 */
gf.input.InputManager.prototype.resetDeltas = function() {
  if (this.keyboard) {
    this.keyboard.resetDeltas();
  }
  if (this.mouse) {
    this.mouse.resetDeltas();
  }
  if (this.touch) {
    this.touch.resetDeltas();
  }
  if (this.gamepad) {
    this.gamepad.resetDeltas();
  }
};


/**
 * Toggles the enable state of all input sources.
 * @param {boolean} value Whether the input sources are enabled.
 */
gf.input.InputManager.prototype.setEnabled = function(value) {
  if (this.keyboard) {
    this.keyboard.setEnabled(value);
  }
  if (this.mouse) {
    this.mouse.setEnabled(value);
  }
  if (this.touch) {
    this.touch.setEnabled(value);
  }
  if (this.gamepad) {
    this.gamepad.setEnabled(value);
  }
};
