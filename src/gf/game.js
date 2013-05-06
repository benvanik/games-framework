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

goog.provide('gf.Game');

goog.require('gf.RenderFrame');
goog.require('gf.Runtime');
goog.require('gf.UpdateFrame');
goog.require('gf.timing.RenderTimer');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.reflect');
goog.require('WTF.trace');



/**
 * Game base type.
 * Games should subclass this type to provide their own logic. Simple games may
 * exist only as subclasses, while more complex ones may build scene hierarchies
 * to delegate update/render calls to.
 *
 * @constructor
 * @extends {gf.Runtime}
 * @param {!gf.LaunchOptions} launchOptions Game options.
 * @param {gf.timing.Clock=} opt_clock Clock to use for time values.
 */
gf.Game = function(launchOptions, opt_clock) {
  goog.base(this, launchOptions, opt_clock);

  /**
   * Event handler.
   * @protected
   * @type {!goog.events.EventHandler}
   */
  this.eh = new goog.events.EventHandler(this);
  this.registerDisposable(this.eh);

  /**
   * Last time the timer got ticked.
   * @private
   * @type {number}
   */
  this.lastTime_ = this.clock.getClientTime();

  /**
   * Whether to use a fixed timestep for updates.
   * If true, then all update frames will have the same time delta and render
   * frames will have some timeAlpha value <= 1.
   * @type {boolean}
   */
  this.fixedTimestep = true;

  /**
   * The duration of each fixed update timestep, in seconds.
   * @type {number}
   */
  this.fixedTimestepDuration = gf.Game.DEFAULT_FRAME_TIMESTEP_;

  /**
   * Time accumulator, used when running in fixed timestep mode.
   * @private
   * @type {number}
   */
  this.timeAccumulator_ = 0;

  /**
   * Cached update frame.
   * @private
   * @type {!gf.UpdateFrame}
   */
  this.updateFrame_ = new gf.UpdateFrame();

  /**
   * Monotonically increasing update frame number.
   * TODO(benvanik): wraparound
   * @private
   * @type {number}
   */
  this.updateFrameNumber_ = 0;

  /**
   * Cached render frame.
   * @private
   * @type {!gf.RenderFrame}
   */
  this.renderFrame_ = new gf.RenderFrame();

  /**
   * Monotonically increasing render frame number.
   * TODO(benvanik): wraparound
   * @private
   * @type {number}
   */
  this.renderFrameNumber_ = 0;

  var self = this;
  /**
   * Active render timer.
   * @type {!gf.timing.RenderTimer}
   */
  this.renderTimer = new gf.timing.RenderTimer(
      function(timestamp) {
        self.renderTick_(timestamp);
      },
      undefined, undefined, 500);
  this.registerDisposable(this.renderTimer);

  /**
   * Whether the timer is currently ticking.
   * @private
   * @type {boolean}
   */
  this.ticking_ = false;
};
goog.inherits(gf.Game, gf.Runtime);


/**
 * Default timestep when running in fixed timestep mode, in seconds.
 * @private
 * @const
 * @type {number}
 */
gf.Game.DEFAULT_FRAME_TIMESTEP_ = 16.777 / 1000;


/**
 * Maximum frame time, in seconds.
 * Frames longer than this will get capped to prevent weird math.
 * @private
 * @const
 * @type {number}
 */
gf.Game.MAX_FRAME_TIME_ = 250 / 1000;


/**
 * Sets the DOM element that is used to display the primary scene.
 * If the given element is not visible then rendering will not be performed.
 * @protected
 * @param {Element} el DOM element.
 */
gf.Game.prototype.setDisplayElement = function(el) {
  this.renderTimer.displayElement = el;
};


/**
 * Begins ticking the timer.
 */
gf.Game.prototype.startTicking = function() {
  if (!this.ticking_) {
    this.ticking_ = true;
    this.renderTimer.start();
  }
};


/**
 * Stops ticking the timer.
 */
gf.Game.prototype.stopTicking = function() {
  if (this.ticking_) {
    this.ticking_ = false;
    this.renderTimer.stop();
  }
};


/**
 * Handles timer ticks.
 * @private
 * @param {number} timestamp Current timestamp.
 */
gf.Game.prototype.renderTick_ = function(timestamp) {
  var time = this.clock.getClientTime();

  var timeDelta = time - this.lastTime_;
  this.lastTime_ = time;
  if (timeDelta > gf.Game.MAX_FRAME_TIME_) {
    // Max frame time - if we go longer than this then we are likely hosed
    timeDelta = gf.Game.MAX_FRAME_TIME_;
  }
  this.timeAccumulator_ += timeDelta;

  // Update
  var timeAlpha = 1;
  if (this.fixedTimestep) {
    var dt = this.fixedTimestepDuration;
    while (this.timeAccumulator_ >= dt) {
      this.update_(this.clock.getGameTime(), dt);
      this.clock.stepGameTime(dt);
      this.timeAccumulator_ -= dt;

      if (!this.ticking_) {
        break;
      }
    }
    timeAlpha = this.timeAccumulator_ / dt;
  } else {
    this.update_(this.clock.getGameTime(), timeDelta);
    this.clock.stepGameTime(timeDelta);
  }

  // Render, only if the tab has focus
  if (this.renderTimer.hasFocus()) {
    this.render_(this.clock.getServerTime(), timeDelta, timeAlpha);
  }
};


/**
 * Updates the game state.
 * @private
 * @param {number} time Current game time, in seconds.
 * @param {number} timeDelta Time elapsed, in seconds.
 */
gf.Game.prototype.update_ = function(time, timeDelta) {
  if (timeDelta <= 0) {
    return;
  }
  var frame = this.updateFrame_;
  frame.init(
      this.updateFrameNumber_++,
      time,
      timeDelta,
      this.renderTimer.hasFocus());
  this.update(frame);
};


/**
 * Renders a game scene.
 * @private
 * @param {number} time Current game time, in seconds.
 * @param {number} timeDelta Time elapsed, in seconds.
 * @param {number} timeAlpha Time interpolation factor.
 */
gf.Game.prototype.render_ = function(time, timeDelta, timeAlpha) {
  // Setup the render frame/poll input/etc
  var frame = this.renderFrame_;
  frame.init(
      this.renderFrameNumber_++,
      time,
      timeDelta,
      timeAlpha);
  this.render(frame);
};


/**
 * Updates the game state.
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.Game.prototype.update = goog.nullFunction;


/**
 * Renders the game.
 * @param {!gf.RenderFrame} frame Current render frame.
 */
gf.Game.prototype.render = goog.nullFunction;


gf.Game = WTF.trace.instrumentType(
    gf.Game, 'gf.Game',
    goog.reflect.object(gf.Game, {
      renderTick_: 'renderTick_',
      update_: 'update_',
      render_: 'render_'
    }));
