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

goog.provide('gf.sim.Scheduler');
goog.provide('gf.sim.SchedulerCallback');
goog.provide('gf.sim.SchedulingPriority');

goog.require('gf');
goog.require('gf.sim.SchedulingPriority');
goog.require('goog.Disposable');



/**
 * Entity update scheduler.
 * Entities can schedule themselves for updates at future times and will be
 * called for processing as the host ticks.
 *
 * It's impossible to schedule updates at exact times, and as such all updates
 * receive the current time and the amount of time elapsed since they last
 * updated.
 *
 * Due to scheduling time limits, it's possible for entity updates to be delayed
 * past when they wanted to be called. Entities can specify a priority when
 * they schedule themselves to request that they preempt other entities. It's
 * a cooperative scheduler, though, so be careful for starvation.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.Runtime} runtime Runtime instance.
 */
gf.sim.Scheduler = function(runtime) {
  goog.base(this);

  // TODO(benvanik): use a linked-list (or bucketed linked list) instead of
  //     an array to speed up insertion and shifting

  /**
   * Runtime instance.
   * Contains the clock used for timing.
   * @private
   * @type {!gf.Runtime}
   */
  this.runtime_ = runtime;

  /**
   * A bucket list of priorities, each containing a sorted list of events
   * by target time.
   * @private
   * @type {!Array.<!Array.<!gf.sim.Scheduler.Event_>>}
   */
  this.scheduledEvents_ = [
    [], // IDLE
    [], // LOW
    [], // NORMAL
    [], // HIGH
    [] // ALWAYS
  ];

  /**
   * A pool of unused events.
   * Events are pulled from this when possible to prevent allocation.
   * @private
   * @type {!Array.<!gf.sim.Scheduler.Event_>}
   */
  this.unusedEventPool_ = [];
};
goog.inherits(gf.sim.Scheduler, goog.Disposable);


/**
 * Schedules a new event.
 * The given callback will be executed as soon as possible to the target time.
 * Callbacks receive ({@code time}, {@code timeDelta}), the current time and
 * the time elapsed since the event was scheduled.
 * @param {gf.sim.SchedulingPriority} priority Priority of the event.
 * @param {number} targetTime Time the event should be run at.
 * @param {!gf.sim.SchedulerCallback} callback Function to call.
 * @param {Object=} opt_scope Scope to call the function in.
 */
gf.sim.Scheduler.prototype.scheduleEvent = function(
    priority, targetTime, callback, opt_scope) {
  // Pull an unused event from the pool if possible, fill with arguments
  var e = this.unusedEventPool_.pop() || new gf.sim.Scheduler.Event_();
  e.priority = priority;
  e.requestTime = this.runtime_.clock.getGameTime();
  e.targetTime = targetTime;
  e.callback = callback;
  e.callbackScope = opt_scope || goog.global;

  // Insert into the proper priority class at the right time
  this.insertEvent_(this.scheduledEvents_[priority], e);
};


/**
 * Inserts the given event into the list at the correct location.
 * @private
 * @param {!Array.<!gf.sim.Scheduler.Event_} list List of events.
 * @param {!gf.sim.Scheduler.Event_} e Event to insert.
 */
gf.sim.Scheduler.prototype.insertEvent_ = function(list, e) {
  // Code copied from goog.array.binarySearch_ - this is perf sensitive
  // and doing all the indirect calls and such was nasty
  var left = 0;
  var right = list.length;
  var found;
  while (left < right) {
    var middle = (left + right) >> 1;
    var compareResult = list[middle] - e.targetTime;
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      found = !compareResult;
    }
  }
  // left == targetIndex
  list.splice(left, 0, e);
};


// TODO(benvanik): find something reasonable as a default
// TODO(benvanik): make a cvar
/**
 * Maximum time per frame to spend running scheduled events.
 * The time check is performed after each priority class is executed, meaning
 * that all events in a single class will be run if any are.
 * This introduces the potential for starvation and other issues.
 * @private
 * @const
 * @type {number}
 */
gf.sim.Scheduler.MAX_TIME_PER_FRAME_ = Number.MAX_VALUE;


/**
 * Updates the scheduler, running all available tasks.
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.Scheduler.prototype.update = function(frame) {
  // TODO(benvanik): could track the next event time and fast exit if it hasn't
  //     hit yet - not sure it's worth it
  var time = frame.time;
  var start = gf.now();
  for (var n = this.scheduledEvents_.length - 1; n >= 0; n--) {
    var events = this.scheduledEvents_[n];
    while (events.length) {
      var e = events[0];
      // Check if the first event is scheduled in the future - since the list
      // is sorted we can early-out
      if (e.targetTime > time) {
        break;
      }

      // Event has expired - issue it
      events.unshift();

      // Pull off properties and return the event to the pool
      // This enables the callback to schedule an event and (ideally) get the
      // same event object back instead of allocating a new one
      var timeDelta = time - e.requestTime;
      var callback = e.callback;
      var callbackScope = e.callbackScope;
      // Null out references to prevent leaks
      e.callback = e.callbackScope = null;
      this.unusedEventPool_.push(e);

      // Callback
      // TODO(benvanik): catch errors better?
      callback.call(callbackScope, time, timeDelta);
    }

    // If we are over our time budget, break out
    // TODO(benvanik): move into event loop? more expensive, but would
    //     reduce the variability that is possible now
    if (gf.now() - start >= gf.sim.Scheduler.MAX_TIME_PER_FRAME_) {
      break;
    }
  }
};



/**
 * Schedule event type.
 * Events are designed to be reused and should only be constructed by the pool
 * utility functions.
 * @private
 * @constructor
 */
gf.sim.Scheduler.Event_ = function() {
  /**
   * Priority of the event.
   * @type {gf.sim.SchedulingPriority}
   */
  this.priority = gf.sim.SchedulingPriority.IDLE;

  /**
   * Time the event was scheduled at.
   * @type {number}
   */
  this.requestTime = 0;

  /**
   * Time the event requested to be run at.
   * @type {number}
   */
  this.targetTime = 0;

  /**
   * Callback to issue.
   * @type {gf.sim.SchedulerCallback}
   */
  this.callback = null;

  /**
   * Scope to execute the callback in.
   * @type {Object}
   */
  this.callbackScope = null;
};


/**
 * Entity scheduling priority class.
 * Entities can pick one of the discrete priority values to signify the
 * priority of their requested updates.
 * @enum {number}
 */
gf.sim.SchedulingPriority = {
  /**
   * Lowest scheduling priority.
   * Examples: weather systems, music controllers.
   */
  IDLE: 0,

  /**
   * Low scheduling priority.
   * Examples: workbenches, item respawners, etc.
   */
  LOW: 1,

  /**
   * Normal scheduling priority.
   * Examples: NPC characters, particle emitters.
   */
  NORMAL: 2,

  /**
   * High scheduling priority.
   * Examples: physics objects.
   */
  HIGH: 3,

  /**
   * Always run when requested, even if it means running over time budget.
   * Examples: player controllers, inventory management, weapons.
   */
  ALWAYS: 4
};


/**
 * A callback to be issued by the scheduler.
 * Callbacks receive ({@code time}, {@code timeDelta}), the current time and
 * the time elapsed since the event was scheduled.
 * @typedef {function(number, number):undefined}
 */
gf.sim.SchedulerCallback;
