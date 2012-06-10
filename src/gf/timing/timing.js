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

goog.provide('gf.timing');


/**
 * Queues a function to be called on the next tick.
 * @param {!Function} fn Function to call.
 * @param {Object=} opt_scope Scope to call the function in.
 * @return {number|null|undefined} An ID that can be used for cancellation.
 */
gf.timing.setImmediate = function(fn, opt_scope) {
  var callback = function() {
    fn.call(opt_scope);
  };

  return goog.global.setTimeout(callback, 0);

  // TODO(benvanik): use setImmediate if detected
  //goog.global.setImmediate(callback);

  // TODO(benvanik): if NODE, use process.nextTick
  //process.nextTick(callback);
};


/**
 * Cancels a previously requested immediate invocation, maybe.
 * This method may not be able to cancel an immediate before it has executed.
 * Always write code defensively such that the immediate can still fire.
 * @param {?number=} opt_id ID returned from {@see gf.timing.setImmediate}.
 */
gf.timing.clearImmediate = function(opt_id) {
  goog.global.clearTimeout(opt_id);
};
