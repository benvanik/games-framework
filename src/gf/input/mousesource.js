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

goog.provide('gf.input.MouseSource');

goog.require('gf.input.InputSource');
goog.require('gf.input.MouseButton');
goog.require('gf.input.MouseData');
goog.require('gf.log');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.EventType');
goog.require('goog.userAgent');



/**
 * Mouse input source.
 *
 * TODO(benvanik): HTML5 mouse lock API support
 *
 * @constructor
 * @extends {gf.input.InputSource}
 * @param {!Element} inputElement Root DOM input element.
 */
gf.input.MouseSource = function(inputElement) {
  goog.base(this, inputElement);

  /**
   * Cached mouse data.
   * Updated as events come in, must be cloned if used elsewhere.
   * @private
   * @type {!gf.input.MouseData}
   */
  this.data_ = new gf.input.MouseData();

  /**
   * Whether mouse locking is supported.
   * @type {boolean}
   */
  this.supportsLocking = !!(
      window.navigator.pointer ||
      window.navigator.mozPointer ||
      window.navigator.webkitPointer);

  /**
   * Whether the mouse is currently locked.
   * @type {boolean}
   */
  this.isLocked = false;

  /**
   * Whether simulating drag.
   * This is needed to switch event mode from inputElement to document so that
   * we still get mouse move/up events even once the cursor leaves the window.
   * It only starts when a mouse button goes down, and ends when the last mouse
   * button goes up.
   * @private
   * @type {boolean}
   */
  this.dragging_ = false;

  // Watch for mouse events
  this.listen(inputElement,
      goog.events.EventType.MOUSEDOWN, this.handleMouseDown_);
  this.listen(inputElement,
      goog.events.EventType.MOUSEMOVE, this.handleMouseMove_);
  this.listen(inputElement,
      goog.events.EventType.MOUSEOVER, this.handleMouseOver_);
  this.listen(inputElement,
      goog.events.EventType.MOUSEOUT, this.handleMouseOut_);
  this.listen(inputElement,
      goog.userAgent.GECKO ? 'DOMMouseScroll' : 'mousewheel',
      this.handleMouseWheel_);
  this.listen(inputElement, [
    goog.events.EventType.SELECTSTART,
    goog.events.EventType.CONTEXTMENU
  ],
  /**
   * @param {!goog.events.BrowserEvent} e Event.
   */
  function(e) {
    e.preventDefault();
  });

  // Watch for pointer lock lost events
  if (this.supportsLocking) {
    this.listen(inputElement, [
      'pointerlocklost',
      'mozpointerlocklost',
      'webkitpointerlocklost'
    ], function() {
      this.isLocked = false;
    });
  }
};
goog.inherits(gf.input.MouseSource, gf.input.InputSource);


/**
 * Locks the mouse to the input element.
 * Only call this method if {@see gf.input.MouseSource#supportsLocking}
 * indicates that mouse locking is available.
 */
gf.input.MouseSource.prototype.lock = function() {
  goog.asserts.assert(this.supportsLocking);
  if (!this.supportsLocking || this.isLocked) {
    return;
  }

  var pointer =
      window.navigator.pointer ||
      window.navigator.mozPointer ||
      window.navigator.webkitPointer;
  pointer.lock(this.inputElement,
      /**
       * Lock succeeded.
       */
      goog.bind(function() {
        // TODO(benvanik): fire event?
        gf.log.write('mouse lock succeeded');
        this.isLocked = true;
      }, this),
      /**
       * Lock failed.
       */
      goog.bind(function() {
        // TODO(benvanik): fire event?
        gf.log.write('mouse lock failed');
      }, this));
};


/**
 * Unlocks the mouse, if it is locked.
 */
gf.input.MouseSource.prototype.unlock = function() {
  if (!this.isLocked) {
    return;
  }

  var pointer =
      window.navigator.pointer ||
      window.navigator.mozPointer ||
      window.navigator.webkitPointer;
  pointer.unlock();
};


/**
 * Handles mouse down events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.MouseSource.prototype.handleMouseDown_ = function(e) {
  e.preventDefault();

  this.data_.update(e);

  var button = /** @type {goog.events.BrowserEvent.MouseButton} */ (e.button);
  switch (button) {
    case goog.events.BrowserEvent.MouseButton.LEFT:
      this.data_.buttons |= gf.input.MouseButton.LEFT;
      this.data_.buttonsDown |= gf.input.MouseButton.LEFT;
      break;
    case goog.events.BrowserEvent.MouseButton.MIDDLE:
      this.data_.buttons |= gf.input.MouseButton.MIDDLE;
      this.data_.buttonsDown |= gf.input.MouseButton.MIDDLE;
      break;
    case goog.events.BrowserEvent.MouseButton.RIGHT:
      this.data_.buttons |= gf.input.MouseButton.RIGHT;
      this.data_.buttonsDown |= gf.input.MouseButton.RIGHT;
      break;
  }

  // Watch for document mouse move/up and treat it as a local event, then we get
  // proper drag behavior when the mouse leaves the window
  // We only do this if we are 'dragging'
  if (this.data_.buttons && !this.dragging_) {
    this.dragging_ = true;
    this.listen(goog.dom.getOwnerDocument(this.inputElement),
        goog.events.EventType.MOUSEMOVE, this.handleMouseMove_);
    this.listen(goog.dom.getOwnerDocument(this.inputElement),
        goog.events.EventType.MOUSEUP, this.handleMouseUp_);
    this.unlisten(this.inputElement,
        goog.events.EventType.MOUSEMOVE, this.handleMouseMove_);
  }
};


/**
 * Handles mouse up events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.MouseSource.prototype.handleMouseUp_ = function(e) {
  e.preventDefault();

  this.data_.update(e);

  var button = /** @type {goog.events.BrowserEvent.MouseButton} */ (e.button);
  switch (button) {
    case goog.events.BrowserEvent.MouseButton.LEFT:
      this.data_.buttons &= ~gf.input.MouseButton.LEFT;
      this.data_.buttonsUp |= gf.input.MouseButton.LEFT;
      break;
    case goog.events.BrowserEvent.MouseButton.MIDDLE:
      this.data_.buttons &= ~gf.input.MouseButton.MIDDLE;
      this.data_.buttonsUp |= gf.input.MouseButton.MIDDLE;
      break;
    case goog.events.BrowserEvent.MouseButton.RIGHT:
      this.data_.buttons &= ~gf.input.MouseButton.RIGHT;
      this.data_.buttonsUp |= gf.input.MouseButton.RIGHT;
      break;
  }

  // If this was the last mouse button, stop the 'drag'
  if (!this.data_.buttons && this.dragging_) {
    this.dragging_ = false;
    this.unlisten(goog.dom.getOwnerDocument(this.inputElement),
        goog.events.EventType.MOUSEMOVE, this.handleMouseMove_);
    this.unlisten(goog.dom.getOwnerDocument(this.inputElement),
        goog.events.EventType.MOUSEUP, this.handleMouseUp_);
    this.listen(this.inputElement,
        goog.events.EventType.MOUSEMOVE, this.handleMouseMove_);
  }
};


/**
 * Handles mouse move events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.MouseSource.prototype.handleMouseMove_ = function(e) {
  e.preventDefault();

  this.data_.update(e);
};


/**
 * Handles mouse over events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.MouseSource.prototype.handleMouseOver_ = function(e) {
  e.preventDefault();
};


/**
 * Handles mouse out events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.MouseSource.prototype.handleMouseOut_ = function(e) {
  e.preventDefault();
};


/**
 * Handles mouse wheel events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.MouseSource.prototype.handleMouseWheel_ = function(e) {
  e.preventDefault();

  var z = 0;
  var browserEvent = e.getBrowserEvent();
  if (goog.isDef(browserEvent.wheelDelta)) {
    z = browserEvent.wheelDelta / 120;
    if (goog.userAgent.OPERA) {
      z = -z;
    }
  } else if (goog.isDef(browserEvent.detail)) {
    z = -browserEvent.detail / 3;
  }

  this.data_.dz += z;
};


/**
 * Gets the latest mouse input data.
 * Note that the data returned is not a copy and will be modified by the source.
 * To persist the state snapshot at the time of polling clone the returned data.
 * @return {!gf.input.MouseData} Mouse input data (not a copy).
 */
gf.input.MouseSource.prototype.poll = function() {
  this.data_.isLocked = this.isLocked;
  return this.data_;
};


/**
 * @override
 */
gf.input.MouseSource.prototype.resetDeltas = function() {
  this.data_.resetDeltas();
};
