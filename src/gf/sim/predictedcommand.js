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

goog.provide('gf.sim.PredictedCommand');

goog.require('gf.sim.Command');



/**
 * Simulation command supporting prediction.
 * Predicted commands are replayed on the client each render frame from the last
 * confirmed predicted command from the server. This process is not cheap, and
 * as such prediction should only be used when required.
 *
 * When executing predicted commands clients should always check the
 * {@see #hasPredicted} flag and only create entities/perform actions if it is
 * false. Continuous actions such as changing velocity, however, should be run
 * regardless of whether its the first or a subsequent execution.
 *
 * @constructor
 * @extends {gf.sim.Command}
 * @param {!gf.sim.CommandType} commandType Command type.
 */
gf.sim.PredictedCommand = function(commandType) {
  goog.base(this, commandType);

  /**
   * Sequence identifier.
   * Monotonically increasing number used for confirming commands.
   * @type {number}
   */
  this.sequence = 0;

  /**
   * Amount of time this command covers, in seconds.
   * @type {number}
   */
  this.timeDelta = 0;

  /**
   * Whether this command has been predicted on the client already.
   * This will be set to false on the first execution and true on all subsequent
   * ones. Commands that create entities/etc in response to commands must always
   * ensure they only do such on the first call.
   * @type {boolean}
   */
  this.hasPredicted = false;
};
goog.inherits(gf.sim.PredictedCommand, gf.sim.Command);
