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

goog.provide('gf.ui.Screen');

goog.require('goog.Disposable');
goog.require('goog.asserts');



/**
 * A screen of content in the screen stack.
 * Screens can be subclassed to be anything; DOM-based displays, WebGL contexts,
 * etc.
 * @constructor
 * @extends {goog.Disposable}
 * @param {number} flags Bitmask of {@see gf.ui.Screen.Flags} values.
 */
gf.ui.Screen = function(flags) {
  goog.base(this);

  /**
   * The screen manager that owns this screen, if the screen has been displayed.
   * @private
   * @type {gf.ui.ScreenManager}
   */
  this.screenManager_ = null;

  /**
   * Bitmask of flags for the screen.
   * @type {number}
   */
  this.flags = flags;

  /**
   * True if the screen is currently active.
   * @private
   * @type {boolean}
   */
  this.active_ = true;

  /**
   * True if the screen has input focus.
   * @private
   * @type {boolean}
   */
  this.focused_ = true;
};
goog.inherits(gf.ui.Screen, goog.Disposable);


/**
 * @override
 */
gf.ui.Screen.prototype.disposeInternal = function() {
  this.exitDocument();
  goog.base(this, 'disposeInternal');
};


/**
 * @return {gf.ui.ScreenManager} The screen manager that owns the screen, if
 *     it has been displayed.
 */
gf.ui.Screen.prototype.getScreenManager = function() {
  return this.screenManager_;
};


/**
 * Sets the screen manager.
 * This should only be called by the screen manager.
 * @param {gf.ui.ScreenManager} value New screen manager.
 */
gf.ui.Screen.prototype.setScreenManager = function(value) {
  this.screenManager_ = value;
};


/**
 * @return {boolean} True if the screen covers the entire display and is opaque.
 */
gf.ui.Screen.prototype.isCoveringDisplay = function() {
  return !!(this.flags & (
      gf.ui.Screen.Flags.COVERS_DISPLAY |
      gf.ui.Screen.Flags.OPAQUE));
};


/**
 * @return {boolean} True if the screen is active and visible. If false, no
 *     rendering should occur.
 */
gf.ui.Screen.prototype.isActive = function() {
  return this.active_;
};


/**
 * Toggles the screen active state.
 * This should only be called by the screen manager.
 * @param {boolean} value True if the screen is active.
 */
gf.ui.Screen.prototype.setActive = function(value) {
  this.active_ = value;
};


/**
 * @return {boolean} True if the screen has input focus. If false, no input
 *     should be processed.
 */
gf.ui.Screen.prototype.hasInputFocus = function() {
  return this.focused_;
};


/**
 * Toggles the screen input focus state.
 * This should only be called by the screen manager.
 * @param {boolean} value True if the screen has input focus.
 */
gf.ui.Screen.prototype.setInputFocus = function(value) {
  this.focused_ = value;
};


/**
 * Closes the screen.
 * Useful if the screen is a popup.
 */
gf.ui.Screen.prototype.close = function() {
  var screenManager = this.getScreenManager();
  goog.asserts.assert(screenManager);
  goog.asserts.assert(screenManager.getTopScreen() == this);
  screenManager.popScreen();
};


/**
 * Handles setting up the screen once it has been added to the document.
 */
gf.ui.Screen.prototype.enterDocument = goog.nullFunction;


/**
 * Handles tearing down the screen once it has been removed from the document.
 */
gf.ui.Screen.prototype.exitDocument = goog.nullFunction;


/**
 * Updates the game contents.
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.ui.Screen.prototype.update = goog.nullFunction;


/**
 * Renders the screen contents.
 * @param {!gf.RenderFrame} frame Current render frame.
 */
gf.ui.Screen.prototype.render = goog.nullFunction;


/**
 * Bitmask flags for screens.
 * @enum {number}
 */
gf.ui.Screen.Flags = {
  /**
   * The screen covers the entire display.
   */
  COVERS_DISPLAY: 1 << 1,

  /**
   * The screen is fully opaque.
   */
  OPAQUE: 1 << 2,

  /**
   * The screen is modal and prevents input on other screens.
   */
  MODAL_INPUT: 1 << 3
};
