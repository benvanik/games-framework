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

goog.provide('gf.sim.VariableTable');

goog.require('gf.sim.Variable');
goog.require('gf.sim.VariableFlag');
goog.require('goog.asserts');



// TODO(benvanik): find a way to do code gen at runtime in compiled code
// Could use it to generate non-looped direct functions with no indirection
/**
 * Optimized variable table.
 * Stores a flattened list of variable descriptors for a type chain.
 * Used for identifying variables over the network and when manipulating
 * state snapshots.
 * Variable tables are static and shared among all entities of a given type.
 *
 * @constructor
 * @param {!Array.<!gf.sim.Variable>} variableList A list of all variables.
 */
gf.sim.VariableTable = function(variableList) {
  // Sort by priority in a stable way
  // We do this with a hack of using the ordinals if the two priorities are the
  // same
  // We can modify the variables in the list pre-clone because anyone actually
  // using the ordinals from inputs will reset them after they clone
  for (var n = 0; n < variableList.length; n++) {
    variableList[n].ordinal = n;
  }
  variableList.sort(gf.sim.Variable.sortByPriority);

  /**
   * Maps variable tags to variables, allowing for lookup by tag.
   * @private
   * @type {!Object.<number, !gf.sim.Variable>}
   */
  this.ordinalLookup_ = {};

  /**
   * Variables that are neither interpolated or predicted.
   * @private
   * @type {!Array.<!gf.sim.Variable>}
   */
  this.immediateVariables_ = [];

  /**
   * Variables that have their {@see gf.sim.VariableFlag#PREDICTED} bit set.
   * @private
   * @type {!Array.<!gf.sim.Variable>}
   */
  this.predictedVariables_ = [];

  /**
   * Variables that have their {@see gf.sim.VariableFlag#INTERPOLATED} bit set.
   * @private
   * @type {!Array.<!gf.sim.Variable>}
   */
  this.interpolatedVariables_ = [];

  /**
   * Variables that have their {@see gf.sim.VariableFlag#INTERPOLATED} bit set
   * but not their {@see gf.sim.VariableFlag#PREDICTED} bit set. This is used
   * for interpolating variables on clients that have prediction enabled.
   * @private
   * @type {!Array.<!gf.sim.Variable>}
   */
  this.interpolatedNotPredictedVariables_ = [];

  /**
   * List, in sorted ordinal order, of all variables.
   * @private
   * @type {!Array.<!gf.sim.Variable>}
   */
  this.variables_ = new Array(variableList.length);
  for (var n = 0; n < variableList.length; n++) {
    // Clone variable so that different types can have different ordinals
    var v = variableList[n].clone();
    this.variables_[n] = v;
    this.ordinalLookup_[v.tag] = v;

    // Assign ordinal
    v.ordinal = n;

    // Add to fast access arrays
    if (!(v.flags & (
        gf.sim.VariableFlag.PREDICTED | gf.sim.VariableFlag.INTERPOLATED))) {
      this.immediateVariables_.push(v);
    }
    if (v.flags & gf.sim.VariableFlag.PREDICTED) {
      this.predictedVariables_.push(v);
    }
    if (v.flags & gf.sim.VariableFlag.INTERPOLATED) {
      this.interpolatedVariables_.push(v);
      if (!(v.flags & gf.sim.VariableFlag.PREDICTED)) {
        this.interpolatedNotPredictedVariables_.push(v);
      }
    }
  }
};


/**
 * Gets the total number of variables in the table.
 * @return {number} Total variable count.
 */
gf.sim.VariableTable.prototype.getCount = function() {
  return this.variables_.length;
};


/**
 * Gets the ordinal of a variable.
 * @param {number} tag Variable tag.
 * @return {number} Variable ordinal.
 */
gf.sim.VariableTable.prototype.getOrdinal = function(tag) {
  var v = this.ordinalLookup_[tag];
  goog.asserts.assert(v);
  return v.ordinal;
};


/**
 * Reads the given variable.
 * @param {number} ordinal Variable ordinal.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.VariableTable.prototype.readVariable = function(
    ordinal, target, reader) {
  var v = this.variables_[ordinal];
  // NOTE: must validate here, as clients could send up bogus info
  if (v) {
    v.read(target, reader);
  }
};


/**
 * Reads all variables.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.VariableTable.prototype.readAllVariables = function(target, reader) {
  var vars = this.variables_;
  for (var n = 0; n < vars.length; n++) {
    vars[n].read(target, reader);
  }
};


/**
 * Writes the given variable.
 * @param {number} ordinal Variable ordinal.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.VariableTable.prototype.writeVariable = function(
    ordinal, target, writer) {
  var v = this.variables_[ordinal];
  v.write(target, writer);
};


/**
 * Writes all variables.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.VariableTable.prototype.writeAllVariables = function(target, writer) {
  var vars = this.variables_;
  for (var n = 0; n < vars.length; n++) {
    vars[n].write(target, writer);
  }
};


/**
 * Copies all variables from one object to another.
 * @param {!Object} source Source object.
 * @param {!Object} target Target object.
 */
gf.sim.VariableTable.prototype.copyVariables = function(source, target) {
  var vars = this.variables_;
  for (var n = 0; n < vars.length; n++) {
    vars[n].copy(source, target);
  }
};


/**
 * Copies all immediate variables from one object to another (those variables
 * that are not predicted/interpolated).
 * @param {!Object} source Source object.
 * @param {!Object} target Target object.
 */
gf.sim.VariableTable.prototype.copyImmediateVariables = function(
    source, target) {
  var vars = this.immediateVariables_;
  for (var n = 0; n < vars.length; n++) {
    vars[n].copy(source, target);
  }
};


/**
 * Copies values of all predicted variables from one object to another.
 * All values in the target with {@see gf.sim.VariableFlag#PREDICTED} set will
 * get overwritten with the source values.
 * @param {!Object} source Source object.
 * @param {!Object} target Target object.
 */
gf.sim.VariableTable.prototype.copyPredictedVariables = function(
    source, target) {
  var vars = this.predictedVariables_;
  for (var n = 0; n < vars.length; n++) {
    vars[n].copy(source, target);
  }
};


/**
 * Interpolates variables between two states.
 * All values with {@see gf.sim.VariableFlag#INTERPOLATED} set will be
 * interpolated between the source and target by the given time. The result
 * will be stored on the given result object.
 * @param {!Object} source Interpolation source object.
 * @param {!Object} target Interpolation target object.
 * @param {number} t Interpolation coefficient, [0-1].
 * @param {!Object} result Storage object.
 */
gf.sim.VariableTable.prototype.interpolateVariables = function(
    source, target, t, result) {
  var vars = this.interpolatedVariables_;
  for (var n = 0; n < vars.length; n++) {
    vars[n].interpolate(source, target, t, result);
  }
};


/**
 * Interpolates unpredicted variables between two states.
 * All values with {@see gf.sim.VariableFlag#INTERPOLATED} set will be
 * interpolated between the source and target by the given time. The result
 * will be stored on the given result object.
 * This version will ignore variables that also have
 * {@see gf.sim.VariableFlag#PREDICTED} set on them, preventing interpolation
 * from messing with the prediction system.
 * @param {!Object} source Interpolation source object.
 * @param {!Object} target Interpolation target object.
 * @param {number} t Interpolation coefficient, [0-1].
 * @param {!Object} result Storage object.
 */
gf.sim.VariableTable.prototype.interpolateUnpredictedVariables = function(
    source, target, t, result) {
  var vars = this.interpolatedNotPredictedVariables_;
  for (var n = 0; n < vars.length; n++) {
    vars[n].interpolate(source, target, t, result);
  }
};
