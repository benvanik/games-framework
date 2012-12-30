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

goog.provide('gf.input.MouseData');

goog.require('goog.events.EventType');



/**
 * Mouse input source update packet.
 * Data may change at any time - if you want to keep a copy of it you must clone
 * it via the {@see gf.input.MouseData#clone} method.
 *
 * @constructor
 */
gf.input.MouseData = function() {
  /**
   * Current coordinate (x) on the screen.
   * @type {number}
   */
  this.screenX = 0;

  /**
   * Current coordinate (y) on the screen.
   * @type {number}
   */
  this.screenY = 0;

  /**
   * Current coordinate (x) on the input element.
   * @type {number}
   */
  this.clientX = 0;

  /**
   * Current coordinate (y) on the input element.
   * @type {number}
   */
  this.clientY = 0;

  /**
   * Change in x, in px.
   * @type {number}
   */
  this.dx = 0;

  /**
   * Change in y, in px.
   * @type {number}
   */
  this.dy = 0;

  /**
   * Change in wheel (z), in detents.
   * @type {number}
   */
  this.dz = 0;

  /**
   * Bitmask of all buttons that are currently depressed.
   * @type {number}
   */
  this.buttons = 0;

  /**
   * Bitmask of all buttons that have been pressed.
   * @type {number}
   */
  this.buttonsDown = 0;

  /**
   * Bitmask of all buttons that have been unpressed.
   * @type {number}
   */
  this.buttonsUp = 0;

  /**
   * Whether the mouse is currently locked.
   * @type {boolean}
   */
  this.isLocked = false;
};


/**
 * Clones the mouse data.
 * @return {!gf.input.MouseData} Cloned mouse input source data.
 */
gf.input.MouseData.prototype.clone = function() {
  var clone = new gf.input.MouseData();
  clone.screenX = this.screenX;
  clone.screenY = this.screenY;
  clone.dx = this.dx;
  clone.dy = this.dy;
  clone.dz = this.dz;
  clone.buttons = this.buttons;
  clone.buttonsDown = this.buttonsDown;
  clone.buttonsUp = this.buttonsUp;
  clone.isLocked = this.isLocked;
  return clone;
};


/**
 * Resets the mouse data state.
 */
gf.input.MouseData.prototype.reset = function() {
  this.screenX = 0;
  this.screenY = 0;
  this.dx = 0;
  this.dy = 0;
  this.dz = 0;
  this.buttons = 0;
  this.buttonsDown = 0;
  this.buttonsUp = 0;
  this.isLocked = false;
};


/**
 * Resets deltas after the data has been polled.
 */
gf.input.MouseData.prototype.resetDeltas = function() {
  this.dx = 0;
  this.dy = 0;
  this.dz = 0;
  this.buttonsDown = 0;
  this.buttonsUp = 0;
};


/**
 * Updates mouse data with the latest from the given event.
 * @param {!goog.events.BrowserEvent} e Event.
 * @param {number} sensitivity Sensitivity scalar.
 */
gf.input.MouseData.prototype.update = function(e, sensitivity) {
  var browserEvent = e.getBrowserEvent();

  var screenX = e.screenX;
  var screenY = e.screenY;
  var dx = 0;
  var dy = 0;
  if (browserEvent.webkitMovementX !== undefined) {
    dx = browserEvent.webkitMovementX;
    dy = browserEvent.webkitMovementY;
  } else if (browserEvent.mozMovementX !== undefined) {
    // mozMovementX/Y are bugged in click events. Sigh.
    if (e.type == goog.events.EventType.MOUSEMOVE) {
      dx = browserEvent.mozMovementX;
      dy = browserEvent.mozMovementY;
    } else {
      dx = dy = 0;
    }
  } else if (browserEvent.movementX !== undefined) {
    dx = browserEvent.movementX;
    dy = browserEvent.movementY;
  } else {
    dx = screenX - this.screenX;
    dy = screenY - this.screenY;
  }

  this.screenX = screenX;
  this.screenY = screenY;
  this.clientX = e.clientX;
  this.clientY = e.clientY;
  this.dx += dx * sensitivity;
  this.dy += dy * sensitivity;
};
