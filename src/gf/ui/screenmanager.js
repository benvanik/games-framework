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

goog.provide('gf.ui.ScreenManager');

goog.require('gf.ui.Screen');
goog.require('goog.Disposable');
goog.require('goog.asserts');



/**
 * Screen stack manager.
 * Enables multiple overlapping game screens to be added to a scene at once.
 * @constructor
 * @extends {goog.Disposable}
 * @param {!goog.dom.DomHelper} dom DOM helper.
 */
gf.ui.ScreenManager = function(dom) {
  goog.base(this);

  /**
   * DOM helper.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom;

  /**
   * Screen stack, where the last item in the array top-most screen.
   * @private
   * @type {!Array.<!gf.ui.Screen>}
   */
  this.stack_ = [];
};
goog.inherits(gf.ui.ScreenManager, goog.Disposable);


/**
 * @override
 */
gf.ui.ScreenManager.prototype.disposeInternal = function() {
  while (this.stack_.length) {
    var screen = this.stack_.pop();
    screen.setScreenManager(null);
    goog.dispose(screen);
  }

  goog.base(this, 'disposeInternal');
};


/**
 * @return {gf.ui.Screen} The screen at the top of the stack, if any.
 */
gf.ui.ScreenManager.prototype.getTopScreen = function() {
  return this.stack_.length ? this.stack_[this.stack_.length - 1] : null;
};


/**
 * Replaces the entire screen stack with the given screen.
 * @param {!gf.ui.Screen} screen Screen to display.
 */
gf.ui.ScreenManager.prototype.setScreen = function(screen) {
  this.popAllScreens();
  this.pushScreen(screen);
};


/**
 * Pushes a new screen on to the stack.
 * @param {!gf.ui.Screen} screen Screen to display.
 */
gf.ui.ScreenManager.prototype.pushScreen = function(screen) {
  goog.asserts.assert(!screen.getScreenManager());
  screen.setScreenManager(screen);
  this.stack_.push(screen);
  this.updateScreenStates_();
  screen.enterDocument();
};


/**
 * Pops the screen at the top of the stack and disposes it.
 */
gf.ui.ScreenManager.prototype.popScreen = function() {
  goog.asserts.assert(this.stack_.length);
  var screen = this.stack_.pop();
  screen.setScreenManager(null);
  goog.dispose(screen);

  this.updateScreenStates_();
};


/**
 * Pops all screens and disposes them.
 */
gf.ui.ScreenManager.prototype.popAllScreens = function() {
  while (this.stack_.length) {
    this.popScreen();
  }
};


/**
 * Updates screen states (input focus/active toggle) based on the current stack.
 * @private
 */
gf.ui.ScreenManager.prototype.updateScreenStates_ = function() {
  // Walk all stacks in reverse - toggling state
  var activeAvailable = true;
  var inputAvailable = true;
  for (var n = this.stack_.length - 1; n >= 0; n--) {
    var screen = this.stack_[n];
    screen.setActive(activeAvailable);
    screen.setInputFocus(inputAvailable);
    if (screen.isCoveringDisplay()) {
      activeAvailable = false;
      inputAvailable = false;
    }
    if (screen.flags & gf.ui.Screen.Flags.MODAL_INPUT) {
      inputAvailable = false;
    }
  }
};


/**
 * Updates the current screen contents.
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.ui.ScreenManager.prototype.update = function(frame) {
  // Always update all screens
  for (var n = 0; n < this.stack_.length; n++) {
    var screen = this.stack_[n];
    screen.update(frame);
  }
};


/**
 * Renders the current screen contents.
 * @param {!gf.RenderFrame} frame Current render frame.
 */
gf.ui.ScreenManager.prototype.render = function(frame) {
  // Only render active screens
  for (var n = 0; n < this.stack_.length; n++) {
    var screen = this.stack_[n];
    if (screen.isActive()) {
      screen.render(frame);
    }
  }
};
