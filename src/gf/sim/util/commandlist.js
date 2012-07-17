/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
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

goog.provide('gf.sim.util.CommandList');



/**
 * Optimized slotted command list.
 * Use this when storing lists of commands (pending for transmission, etc) to
 * prevent excessive array manipulation.
 *
 * @constructor
 */
gf.sim.util.CommandList = function() {
  /**
   * Command array.
   * The size of this array does not correspond to the number of valid commands
   * inside of it. Use {@see #getCount} for the real count.
   * @private
   * @type {!Array.<!gf.sim.Command>}
   */
  this.array_ = [];

  /**
   * Number of commands currently in the list.
   * @private
   * @type {number}
   */
  this.count_ = 0;
};


/**
 * Compacts the command list.
 * This should be called somewhat frequently to ensure the lists do not grow
 * without bound.
 */
gf.sim.util.CommandList.prototype.compact = function() {
  // TODO(benvanik): compaction
};


/**
 * @return {!Array.<!gf.sim.Command>} Current underlying command array.
 */
gf.sim.util.CommandList.prototype.getArray = function() {
  return this.array_;
};


/**
 * @return {number} The number of commands currently in the list.
 */
gf.sim.util.CommandList.prototype.getCount = function() {
  return this.count_;
};


/**
 * Adds a command to the list.
 * @param {!gf.sim.Command} command Command to add.
 */
gf.sim.util.CommandList.prototype.addCommand = function(command) {
  this.array_[this.count_++] = command;
};


/**
 * Releases all commands in the list.
 */
gf.sim.util.CommandList.prototype.releaseAllCommands = function() {
  for (var n = 0; n < this.count_; n++) {
    var command = this.array_[n];
    command.factory.release(command);
  }
  this.count_ = 0;
};


/**
 * Quickly resets the entire list without releasing any commands.
 */
gf.sim.util.CommandList.prototype.resetList = function() {
  this.count_ = 0;
};
