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

goog.provide('gf.input.KeyboardSource');

goog.require('gf.input.InputSource');
goog.require('gf.input.KeyboardData');
goog.require('goog.dom');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');



/**
 * Keyboard input source.
 *
 * @constructor
 * @extends {gf.input.InputSource}
 * @param {!Element} inputElement Root DOM input element.
 */
gf.input.KeyboardSource = function(inputElement) {
  goog.base(this, inputElement);

  /**
   * A callback that will be called when a request for fullscreen toggle is
   * made by the user.
   * @private
   * @type {(function(): void)?}
   */
  this.fullScreenHandler_ = null;

  /**
   * Cached keyboard data.
   * Updated as events come in, must be cloned if used elsewhere.
   * @private
   * @type {!gf.input.KeyboardData}
   */
  this.data_ = new gf.input.KeyboardData();

  // Start listening
  this.enabled = false;
  this.setEnabled(true);
};
goog.inherits(gf.input.KeyboardSource, gf.input.InputSource);


/**
 * Sets the callback that will be called when a request for fullscreen toggle is
 * made by the user.
 * @param {(function(): void)?} callback The new callback.
 */
gf.input.KeyboardSource.prototype.setFullScreenHandler = function(callback) {
  this.fullScreenHandler_ = callback;
};


/**
 * Checks whether the event contains a special key event, such as a browser
 * reload request/etc.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 * @return {boolean} True if the event is a special key sequence.
 */
gf.input.KeyboardSource.prototype.isSpecialKey_ = function(e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.keyCode) {
      case goog.events.KeyCodes.R: // ctrl-r, reload
        return true;
      case goog.events.KeyCodes.I: // ctrl-meta-i, dev tools mac
        return true;
    }
    if (e.shiftKey) {
      switch (e.keyCode) {
        case goog.events.KeyCodes.J: // ctrl-shift-j, dev tools
          return true;
      }
    }
  } else {
    switch (e.keyCode) {
      case goog.events.KeyCodes.ESC: // esc
      case goog.events.KeyCodes.F5: // f5, reload
        return true;
    }
  }
  return false;
};


/**
 * Handles key down events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.KeyboardSource.prototype.handleKeyDown_ = function(e) {
  // Ignore special events
  if (this.isSpecialKey_(e)) {
    return;
  }
  e.preventDefault();

  this.data_.update(e, true);

  // Check for alt-enter fullscreen toggle - the request *must* come from this
  // handler for security reasons, which is why the model is broken here a bit
  if (this.data_.didKeyGoDown(goog.events.KeyCodes.ENTER) &&
      (this.data_.altKey || this.data_.metaKey)) {
    if (this.fullScreenHandler_) {
      this.fullScreenHandler_();
    }
  }
};


/**
 * Handles key up events.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.KeyboardSource.prototype.handleKeyUp_ = function(e) {
  // Ignore special events
  if (this.isSpecialKey_(e)) {
    return;
  }
  e.preventDefault();

  this.data_.update(e, false);
};


/**
 * Handles key reset events, such as browser focus loss.
 * @private
 * @param {!goog.events.BrowserEvent} e Event.
 */
gf.input.KeyboardSource.prototype.handleKeyReset_ = function(e) {
  this.data_.reset();
};


/**
 * Gets the latest keyboard input data.
 * Note that the data returned is not a copy and will be modified by the source.
 * To persist the state snapshot at the time of polling clone the returned data.
 * @return {!gf.input.KeyboardData} Keyboard input data (not a copy).
 */
gf.input.KeyboardSource.prototype.poll = function() {
  return this.data_;
};


/**
 * Resets all input data.
 */
gf.input.KeyboardSource.prototype.reset = function() {
  this.data_.reset();
};


/**
 * @override
 */
gf.input.KeyboardSource.prototype.resetDeltas = function() {
  this.data_.resetDeltas();
};


/**
 * @override
 */
gf.input.KeyboardSource.prototype.setEnabled = function(value) {
  if (this.enabled == value) {
    return;
  }
  goog.base(this, 'setEnabled', value);

  if (value) {
    var doc = goog.dom.getOwnerDocument(this.inputElement);
    this.listen(doc,
        goog.events.EventType.KEYDOWN, this.handleKeyDown_);
    this.listen(doc,
        goog.events.EventType.KEYUP, this.handleKeyUp_);
    this.listen(goog.dom.getWindow(doc),
        [goog.events.EventType.FOCUS, goog.events.EventType.BLUR],
        this.handleKeyReset_);
  } else {
    this.removeAll();
  }
};
