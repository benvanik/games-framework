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
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either exgmess or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

goog.provide('gf.util.RenderTimer');

goog.require('gf');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');



/**
 * A timer abstraction that will use requestAnimationFrame if it is available
 * or fall back to setTimeout.
 * Note that this timer may not fire if the given display element is off screen
 * or if the current tab is hidden.
 *
 * start() and stop() are reference counted - always be sure to call in pairs!
 * If multiple parts of an application want to share timers just start/stop as
 * normal and the timer will continue to run so long as any have requested it.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!function(number): void} userCallback User tick callback.
 * @param {boolean=} opt_forceFallback Force the browser fallback, even if
 *     requestAnimationFrame exists.
 * @param {boolean=} opt_pauseOnFocusLoss Whether to pause when focus is lost.
 * @param {number=} opt_forcedTickInterval If provided, a tick will be forced
 *     at the given time (in ms), even if the tab is not visible.
 */
gf.util.RenderTimer = function(userCallback,
    opt_forceFallback, opt_pauseOnFocusLoss,
    opt_forcedTickInterval) {
  goog.base(this);

  /**
   * Event handler to support easy event tracking.
   * @private
   * @type {!goog.events.EventHandler}
   */
  this.eh_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eh_);

  /**
   * @private
   * @type {!function(number): void}
   */
  this.userCallback_ = userCallback;

  /**
   * Display DOM element, if available.
   * Used to optimize presentation so that rendering is not performed when
   * the element is not displayed.
   * @type {Element}
   */
  this.displayElement = null;

  /**
   * requestAnimationFrame, if supported.
   * Unbound and must be called on window.
   * @private
   * @type {(function(function(number): void, Element=): number)?}
   */
  this.requestAnimationFrame_ = null;

  /**
   * cancelRequestAnimationFrame, if supported.
   * Unbound and must be called on window.
   * Note that even if requestAnimationFrame is present, cancel may not be.
   * @private
   * @type {(function(number): void)?}
   */
  this.cancelAnimationFrame_ = null;

  if (!opt_forceFallback) {
    var browserRaf =
        goog.global['requestAnimationFrame'] ||
        goog.global['webkitRequestAnimationFrame'] ||
        goog.global['mozRequestAnimationFrame'] ||
        goog.global['oRequestAnimationFrame'] ||
        goog.global['msRequestAnimationFrame'];
    if (browserRaf) {
      this.requestAnimationFrame_ = browserRaf;
    }
    var browserCancelRaf =
        goog.global['cancelAnimationFrame'] ||
        goog.global['webkitCancelAnimationFrame'] ||
        goog.global['mozCancelAnimationFrame'] ||
        goog.global['oCancelAnimationFrame'] ||
        goog.global['msCancelAnimationFrame'];
    if (browserCancelRaf) {
      this.cancelAnimationFrame_ = browserCancelRaf;
    }
  }

  /**
   * Whether the timer is running.
   * Note that this may differ from the state of intervalId_ if the timer has
   * been left to idle because the tab has lost focus.
   * This is a ref count of the number of requests to start(). When 0 the timer
   * should be stopped.
   * @private
   * @type {number}
   */
  this.runningCount_ = 0;

  /**
   * Current timer interval ID.
   * @private
   * @type {?number}
   */
  this.intervalId_ = null;

  /**
   * Timestamp of the last real tick.
   * @private
   * @type {number}
   */
  this.lastTick_ = 0;

  /**
   * Whether the current tab has focus.
   * @private
   * @type {boolean}
   */
  this.tabFocused_ = true;

  /**
   * Forced tick interval time in ms, or 0 to disable.
   * @private
   * @type {number}
   */
  this.forcedTickInterval_ = opt_forcedTickInterval || 0;

  /**
   * Simulated tick interval, if any.
   * @private
   * @type {?number}
   */
  this.simulatedIntervalId_ = null;

  if (opt_pauseOnFocusLoss) {
    // Track tab focus/lost
    this.eh_.listen(goog.global, goog.events.EventType.BLUR, function() {
      this.tabFocused_ = false;
    });
    this.eh_.listen(goog.global, goog.events.EventType.FOCUS, function() {
      if (this.tabFocused_) {
        // Certain browsers fire too many events
        return;
      }
      this.tabFocused_ = true;
      if (this.runningCount_) {
        this.start(true);
      }
    });
  }
};
goog.inherits(gf.util.RenderTimer, goog.Disposable);


/**
 * @override
 */
gf.util.RenderTimer.prototype.disposeInternal = function() {
  this.stop(true);
  this.displayElement = null;

  goog.base(this, 'disposeInternal');
};


/**
 * Gets a value indicating whether the timer is active and running.
 * @return {boolean} True if the timer is running.
 */
gf.util.RenderTimer.prototype.isRunning = function() {
  return this.runningCount_ > 0;
};


/**
 * Starts the render timer, if it is not running.
 * @param {boolean=} opt_force Force a start, not incrementing the ref count.
 */
gf.util.RenderTimer.prototype.start = function(opt_force) {
  if (!opt_force) {
    this.runningCount_++;
    if (this.runningCount_ > 1) {
      // Already running, just a reference increase
      return;
    }
  }
  if (this.tabFocused_) {
    var self = this;
    if (this.requestAnimationFrame_) {
      this.intervalId_ = this.requestAnimationFrame_.call(goog.global,
          function(opt_timestamp) {
            self.callback_(opt_timestamp);
          }, this.displayElement);
    } else {
      this.intervalId_ = goog.global.setTimeout(
          function() {
            self.callback_();
          }, 1000 / 16);
    }
  }

  // Always immediately call, to reduce latency
  this.callback_();

  // Simulate ticks if it has been too long without one
  if (this.forcedTickInterval_) {
    var self = this;
    this.simulatedIntervalId_ = goog.global.setInterval(
        function() {
          self.simulateTick();
        }, this.forcedTickInterval_);
  }
};


/**
 * Stops the render timer, if it is running.
 * @param {boolean=} opt_force Force a stop, not decrementing the ref count.
 */
gf.util.RenderTimer.prototype.stop = function(opt_force) {
  if (!opt_force && !this.runningCount_) {
    return;
  }
  if (!opt_force) {
    this.runningCount_--;
  }
  if (!this.runningCount_) {
    var intervalId = this.intervalId_;
    goog.asserts.assert(intervalId);
    if (this.cancelAnimationFrame_) {
      this.cancelAnimationFrame_.call(goog.global, intervalId);
    } else if (!this.requestAnimationFrame_) {
      goog.global.clearTimeout(intervalId);
    }
    this.intervalId_ = null;

    // Stop simulated interval
    if (this.simulatedIntervalId_ !== null) {
      goog.global.clearInterval(this.simulatedIntervalId_);
      this.simulatedIntervalId_ = null;
    }
  }
};


/**
 * Handles callbacks from the browser timer API.
 * @private
 * @param {number=} opt_timestamp Timestamp.
 */
gf.util.RenderTimer.prototype.callback_ = function(opt_timestamp) {
  // Handle cases where we were stopped but still got called
  // Such as in browsers that don't support cancelRequestAnimationFrame
  if (this.intervalId_ === null) {
    return;
  }
  this.intervalId_ = null;

  // Queue the next callback at the start of this callback - that way if
  // setTimeout is used we aren't drifting as much if this frame runs long
  // Only requeue if the tab has focus
  if (this.tabFocused_) {
    var self = this;
    if (this.requestAnimationFrame_) {
      this.intervalId_ = this.requestAnimationFrame_.call(goog.global,
          function(opt_timestamp) {
            self.callback_(opt_timestamp);
          }, this.displayElement);
    } else {
      this.intervalId_ = goog.global.setTimeout(
          function() {
            self.callback_();
          }, 16);
    }
  }

  // Fix time if not present (like from setTimeout)
  var timestamp = opt_timestamp || gf.now();

  // Callback!
  this.lastTick_ = timestamp;
  this.userCallback_(timestamp);
};


/**
 * Issues a user callback as if the timer has ticked.
 */
gf.util.RenderTimer.prototype.simulateTick = function() {
  var delta = gf.now() - this.lastTick_;
  if (delta >= this.forcedTickInterval_) {
    if (this.runningCount_) {
      var timestamp = gf.now();
      this.lastTick_ = timestamp;
      this.userCallback_(timestamp);
    }
  }
};
