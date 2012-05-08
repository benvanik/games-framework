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

goog.provide('gf.input.KeyboardData');

goog.require('goog.events.KeyCodes');
goog.require('goog.object');
goog.require('goog.userAgent');



/**
 * Keyboard input source update packet.
 * Data may change at any time - if you want to keep a copy of it you must clone
 * it via the {@see gf.input.KeyboardData#clone} method.
 *
 * A lot of this code is either lifted or inspired by the code from the Closure
 * {@see goog.events.KeyHandler} class. Unfortunately its design is not such
 * that it can easily be reused for the behavior desired here.
 *
 * @constructor
 */
gf.input.KeyboardData = function() {
  /**
   * Ctrl key is down.
   * @type {boolean}
   */
  this.ctrlKey = false;

  /**
   * Alt key is down.
   * @type {boolean}
   */
  this.altKey = false;

  /**
   * Shift key is down.
   * @type {boolean}
   */
  this.shiftKey = false;

  /**
   * Meta key is down.
   * @type {boolean}
   */
  this.metaKey = false;

  /**
   * A map of all keys that are currently pressed.
   * If a keyCode is present in this map then it is down - the value is ignored.
   * @private
   * @type {!Object.<boolean>}
   */
  this.keys_ = {};

  /**
   * A map of all keys that have gone down since the last poll.
   * @private
   * @type {!Object.<boolean>}
   */
  this.keysDown_ = {};

  /**
   * A map of all keys that have gone up since the last poll.
   * @private
   * @type {!Object.<boolean>}
   */
  this.keysUp_ = {};

  /**
   * If there is anything in {@see #keys_} that could need clearing.
   * @private
   * @type {number}
   */
  this.keyCount_ = 0;

  /**
   * If there is anything in {@see #keysUp_} or {@see #keysDown_} that could
   * need clearing.
   * @private
   * @type {number}
   */
  this.keyDeltaCount_ = 0;
};


/**
 * Determines whether the given key is down.
 * @param {number} keyCode Key code.
 * @return {boolean} True if the key is down.
 */
gf.input.KeyboardData.prototype.isKeyDown = function(keyCode) {
  return keyCode in this.keys_;
};


/**
 * Determines whether the given key is up.
 * @param {number} keyCode Key code.
 * @return {boolean} True if the key is up.
 */
gf.input.KeyboardData.prototype.isKeyUp = function(keyCode) {
  return !(keyCode in this.keys_);
};


/**
 * Gets a list containing the key codes of all currently pressed keys.
 * @return {!Array.<number>} The key codes of all currently pressed keys.
 */
gf.input.KeyboardData.prototype.getPressedKeys = function() {
  var keys = [];
  for (var keyCode in this.keys_) {
    keys.push(Number(keyCode));
  }
  return keys;
};


/**
 * Gets a list containing the key codes of all keys that went down since the
 * last poll.
 * @return {!Array.<number>} The key codes of all keys that went down.
 */
gf.input.KeyboardData.prototype.getKeysDown = function() {
  var keys = [];
  for (var keyCode in this.keysDown_) {
    keys.push(Number(keyCode));
  }
  return keys;
};


/**
 * Gets a list containing the key codes of all keys that went up since the last
 * poll.
 * @return {!Array.<number>} The key codes of all keys that went up.
 */
gf.input.KeyboardData.prototype.getKeysUp = function() {
  var keys = [];
  for (var keyCode in this.keysUp_) {
    keys.push(Number(keyCode));
  }
  return keys;
};


/**
 * Determines whether the given key went down since the last poll.
 * @param {number} keyCode Key code.
 * @return {boolean} True if the key is down.
 */
gf.input.KeyboardData.prototype.didKeyGoDown = function(keyCode) {
  return keyCode in this.keysDown_;
};


/**
 * Determines whether the given key went up since the last poll.
 * @param {number} keyCode Key code.
 * @return {boolean} True if the key is up.
 */
gf.input.KeyboardData.prototype.didKeyGoUp = function(keyCode) {
  return !(keyCode in this.keysUp_);
};


/**
 * Clones the keybard data.
 * @return {!gf.input.KeyboardData} Cloned keyboard input source data.
 */
gf.input.KeyboardData.prototype.clone = function() {
  var clone = new gf.input.KeyboardData();
  clone.ctrlKey = this.ctrlKey;
  clone.altKey = this.altKey;
  clone.shiftKey = this.shiftKey;
  clone.metaKey = this.metaKey;
  clone.keys_ = /** @type {!Object.<boolean>} */ (
      goog.object.clone(this.keys_));
  clone.keysDown_ = /** @type {!Object.<boolean>} */ (
      goog.object.clone(this.keysDown_));
  clone.keysUp_ = /** @type {!Object.<boolean>} */ (
      goog.object.clone(this.keysUp_));
  clone.keyCount_ = this.keyCount_;
  clone.keyDeltaCount_ = this.keyDeltaCount_;
  return clone;
};


/**
 * Resets the keyboard data state.
 */
gf.input.KeyboardData.prototype.reset = function() {
  this.ctrlKey = false;
  this.altKey = false;
  this.shiftKey = false;
  this.metaKey = false;
  if (this.keyCount_) {
    goog.object.clear(this.keys_);
    this.keyCount_ = 0;
  }
  if (this.keyDeltaCount_) {
    goog.object.clear(this.keysDown_);
    goog.object.clear(this.keysUp_);
    this.keyDeltaCount_ = 0;
  }
};


/**
 * Resets deltas after the data has been polled.
 */
gf.input.KeyboardData.prototype.resetDeltas = function() {
  if (this.keyDeltaCount_) {
    goog.object.clear(this.keysDown_);
    goog.object.clear(this.keysUp_);
  }
  this.keyDeltaCount_ = 0;
};


/**
 * Updates keyboard data with the latest from the given event.
 * @param {!goog.events.BrowserEvent} e Event.
 * @param {boolean} isDown True if the event is a key down, else key up.
 */
gf.input.KeyboardData.prototype.update = function(e, isDown) {
  var browserEvent = e.getBrowserEvent();
  var keyIdentifier = browserEvent.keyIdentifier;
  var keyCode = e.keyCode;

  // Correct the key value for certain browser-specific quirks
  if (keyCode) {
    // Safari returns 25 for Shift+Tab instead of 9
    if (keyCode == 25 && e.shiftKey) {
      keyCode = 9;
    }
    // TODO(benvanik): is this still required in modern FF's?
    if (goog.userAgent.GECKO &&
        keyCode in gf.input.KeyboardData.mozKeyCodeToKeyCodeMap_) {
      keyCode = gf.input.KeyboardData.mozKeyCodeToKeyCodeMap_[keyCode];
    }
  } else if (keyIdentifier &&
             keyIdentifier in gf.input.KeyboardData.keyIdentifier_) {
    // This is needed for Safari Windows because it currently doesn't give a
    // keyCode/which for non printable keys
    keyCode = gf.input.KeyboardData.keyIdentifier_[keyIdentifier];
  }

  // Set values
  // Also track special keys
  // NOTE: cannot use the event values for specials, as they are unreliable
  if (isDown) {
    this.keys_[keyCode] = true;
    this.keysDown_[keyCode] = true;
    this.keyCount_++;
    this.keyDeltaCount_++;
  } else {
    delete this.keys_[keyCode];
    this.keysUp_[keyCode] = true;
    this.keyCount_--;
    this.keyDeltaCount_++;
  }

  switch (keyCode) {
    case goog.events.KeyCodes.CTRL:
      this.ctrlKey = isDown;
      break;
    case goog.events.KeyCodes.ALT:
      this.altKey = isDown;
      break;
    case goog.events.KeyCodes.SHIFT:
      this.shiftKey = isDown;
      break;
    case goog.events.KeyCodes.META:
    case goog.events.KeyCodes.WIN_KEY_RIGHT:
      this.metaKey = isDown;
      break;
  }
};


/**
 * An enumeration of key identifiers currently part of the W3C draft for DOM3
 * and their mappings to keyCodes.
 * http://www.w3.org/TR/DOM-Level-3-Events/keyset.html#KeySet-Set
 * This is currently supported in Safari and should be platform independent.
 * @type {!Object.<number>}
 * @private
 */
gf.input.KeyboardData.keyIdentifier_ = {
  'Up': goog.events.KeyCodes.UP, // 38
  'Down': goog.events.KeyCodes.DOWN, // 40
  'Left': goog.events.KeyCodes.LEFT, // 37
  'Right': goog.events.KeyCodes.RIGHT, // 39
  'Enter': goog.events.KeyCodes.ENTER, // 13
  'F1': goog.events.KeyCodes.F1, // 112
  'F2': goog.events.KeyCodes.F2, // 113
  'F3': goog.events.KeyCodes.F3, // 114
  'F4': goog.events.KeyCodes.F4, // 115
  'F5': goog.events.KeyCodes.F5, // 116
  'F6': goog.events.KeyCodes.F6, // 117
  'F7': goog.events.KeyCodes.F7, // 118
  'F8': goog.events.KeyCodes.F8, // 119
  'F9': goog.events.KeyCodes.F9, // 120
  'F10': goog.events.KeyCodes.F10, // 121
  'F11': goog.events.KeyCodes.F11, // 122
  'F12': goog.events.KeyCodes.F12, // 123
  'U+007F': goog.events.KeyCodes.DELETE, // 46
  'Home': goog.events.KeyCodes.HOME, // 36
  'End': goog.events.KeyCodes.END, // 35
  'PageUp': goog.events.KeyCodes.PAGE_UP, // 33
  'PageDown': goog.events.KeyCodes.PAGE_DOWN, // 34
  'Insert': goog.events.KeyCodes.INSERT // 45
};


/**
 * Map from Gecko specific key codes to cross browser key codes.
 * @type {!Object.<number>}
 * @private
 */
gf.input.KeyboardData.mozKeyCodeToKeyCodeMap_ = {
  61: 187,  // =, equals
  59: 186,  // ;, semicolon
  224: 91   // meta
};
