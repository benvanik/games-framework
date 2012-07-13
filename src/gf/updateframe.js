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

goog.provide('gf.UpdateFrame');



/**
 * Game frame state.
 *
 * @constructor
 */
gf.UpdateFrame = function() {
  /**
   * Monotonically increasing update frame number.
   * @type {number}
   */
  this.frameNumber = 0;

  /**
   * Current game simulation time, in seconds.
   * @type {number}
   */
  this.time = 0;

  /**
   * Amount of time elapsed since the last frame, in seconds.
   * @type {number}
   */
  this.timeDelta = 0;

  /**
   * Whether the tab has focus or this is a forced update.
   * @type {boolean}
   */
  this.hasFocus = false;
};


/**
 * Initializes an update frame.
 * @param {number} frameNumber Frame number.
 * @param {number} time Current game time, in seconds.
 * @param {number} timeDelta Amount of time elapsed since the last frame, in
 *     seconds.
 * @param {boolean} hasFocus Whether the tab has focus during this update.
 */
gf.UpdateFrame.prototype.init =
    function(frameNumber, time, timeDelta, hasFocus) {
  this.frameNumber = frameNumber;
  this.time = time;
  this.timeDelta = timeDelta;
  this.hasFocus = hasFocus;
};
