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

goog.provide('gf.RenderFrame');



/**
 * Game frame state.
 *
 * @constructor
 */
gf.RenderFrame = function() {
  /**
   * Monotonically increasing frame number.
   * @type {number}
   */
  this.frameNumber = 0;

  /**
   * Current server time, in seconds.
   * @type {number}
   */
  this.time = 0;

  /**
   * Amount of time elapsed since the last frame, in seconds.
   * @type {number}
   */
  this.timeDelta = 0;

  /**
   * If running in fixed timestep mode this will be [0-1] with the interpolation
   * between the previous and current physics state values (with 0 being all of
   * previous and 1 being all of current). When not in fixed timestep mode this
   * will always be 1.
   * @type {number}
   */
  this.timeAlpha = 0;
};


/**
 * Initializes a render frame.
 * @param {number} frameNumber Frame number.
 * @param {number} time Current game time, in seconds.
 * @param {number} timeDelta Amount of time elapsed since the last frame, in
 *     seconds.
 * @param {number} timeAlpha [0-1] time interpolation between previous and
 *     current state.
 */
gf.RenderFrame.prototype.init =
    function(frameNumber, time, timeDelta, timeAlpha) {
  this.frameNumber = frameNumber;
  this.time = time;
  this.timeDelta = timeDelta;
  this.timeAlpha = timeAlpha;
};
