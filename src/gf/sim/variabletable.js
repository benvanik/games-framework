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
 * @param {!Object} obj A representative object with an initialized prototype
 *     chain. Used for JITing.
 */
gf.sim.VariableTable = function(variableList, obj) {
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
   * A table of variable read functions.
   * These are JITed functions that read variables into a value.
   * Array order matches variable order.
   * @private
   * @type {!Array.<!function(!Object, !gf.net.PacketReader)>}
   */
  this.readTable_ = new Array(variableList.length);

  /**
   * A table of variable write functions.
   * These are JITed functions that write variables into a value.
   * Array order matches variable order.
   * @private
   * @type {!Array.<!function(!Object, !gf.net.PacketWriter)>}
   */
  this.writeTable_ = new Array(variableList.length);

  // Here lies black magic
  // This code carefully constructs Functions while being mindful of the Closure
  // Compiler renaming rules - it does this through some clever hacks that will
  // likely break with ambiguation enabled - I hope that doesn't happen.
  // This should be fairly efficient, and since vtables are shared across all
  // entities of a given type this is a one-time per-entity type hit.
  var readAllVariablesFn = '';
  var writeAllVariablesFn = '';
  var copyVariablesFn = '';
  var copyImmediateVariablesFn = '';
  var copyInterpolatedVariablesFn = '';
  var copyPredictedVariablesFn = '';
  var interpolateVariablesFn = '';
  var interpolateUnpredictedVariablesFn = '';

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

    // Read/write table
    this.readTable_[n] = new Function(
        'target', 'reader', v.getReadSource(obj));
    this.writeTable_[n] = new Function(
        'target', 'writer', v.getWriteSource(obj));

    // Add function JIT per-variable statements
    readAllVariablesFn += v.getReadSource(obj);
    writeAllVariablesFn += v.getWriteSource(obj);
    var copySource = v.getCopySource(obj);
    copyVariablesFn += copySource;
    if (!(v.flags & (
        gf.sim.VariableFlag.PREDICTED | gf.sim.VariableFlag.INTERPOLATED))) {
      copyImmediateVariablesFn += copySource;
    }
    if (v.flags & gf.sim.VariableFlag.PREDICTED) {
      copyPredictedVariablesFn += copySource;
    }
    if (v.flags & gf.sim.VariableFlag.INTERPOLATED) {
      var interpolateSource = v.getInterpolateSource(obj);
      interpolateVariablesFn += interpolateSource;
      copyInterpolatedVariablesFn += copySource;
      if (!(v.flags & gf.sim.VariableFlag.PREDICTED)) {
        interpolateUnpredictedVariablesFn += interpolateSource;
      }
    }
  }

  /**
   * Reads all variables.
   * @param {!Object} target Target object.
   * @param {!gf.net.PacketReader} reader Packet reader.
   */
  this.readAllVariables = new Function(
      'target', 'reader', readAllVariablesFn);

  /**
   * Writes all variables.
   * @param {!Object} target Target object.
   * @param {!gf.net.PacketWriter} writer Packet writer.
   */
  this.writeAllVariables = new Function(
      'target', 'writer', writeAllVariablesFn);

  /**
   * Copies all variables from one object to another.
   * @param {!Object} source Source object.
   * @param {!Object} target Target object.
   */
  this.copyVariables = new Function(
      'source', 'target', copyVariablesFn);

  /**
   * Copies all immediate variables from one object to another (those variables
   * that are not predicted/interpolated).
   * @param {!Object} source Source object.
   * @param {!Object} target Target object.
   */
  this.copyImmediateVariables = new Function(
      'source', 'target', copyImmediateVariablesFn);

  /**
   * Copies values of all interpolated variables from one object to another.
   * All values in the target with {@see gf.sim.VariableFlag#INTERPOLATED} set
   * will get overwritten with the source values.
   * @param {!Object} source Source object.
   * @param {!Object} target Target object.
   */
  this.copyInterpolatedVariables = new Function(
      'source', 'target', copyInterpolatedVariablesFn);

  /**
   * Copies values of all predicted variables from one object to another.
   * All values in the target with {@see gf.sim.VariableFlag#PREDICTED} set will
   * get overwritten with the source values.
   * @param {!Object} source Source object.
   * @param {!Object} target Target object.
   */
  this.copyPredictedVariables = new Function(
      'source', 'target', copyPredictedVariablesFn);

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
  this.interpolateVariables = new Function(
      'source', 'target', 't', 'result', interpolateVariablesFn);

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
  this.interpolateUnpredictedVariables = new Function(
      'source', 'target', 't', 'result', interpolateUnpredictedVariablesFn);
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
 * Reads a range of delta variables.
 * This function is designed to be called on a subset of the variable range.
 * For example, the first 32 variables, second 32, etc.
 * @param {number} startingOrdinal Ordinal this range starts at.
 * @param {number} presentBits Bit field indicating which variables are present.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.VariableTable.prototype.readPresentVariables = function(
    startingOrdinal, presentBits, target, reader) {
  var readTable = this.readTable_;
  var ordinal = startingOrdinal;
  while (presentBits) {
    if (presentBits & 1) {
      // Variable at <ordinal> is present and needs reading
      // NOTE: must validate here, as clients could send up bogus info
      if (readTable[ordinal]) {
        readTable[ordinal](target, reader);
      }
    }
    presentBits >>= 1;
    ordinal++;
  }
};


/**
 * Writes a range of delta variables.
 * This function is designed to be called on a subset of the variable range.
 * For example, the first 32 variables, second 32, etc.
 * @param {number} startingOrdinal Ordinal this range starts at.
 * @param {number} presentBits Bit field indicating which variables are present.
 * @param {!Object} target Target object.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.VariableTable.prototype.writePresentVariables = function(
    startingOrdinal, presentBits, target, writer) {
  var writeTable = this.writeTable_;
  var ordinal = startingOrdinal;
  while (presentBits) {
    if (presentBits & 1) {
      // Variable at <ordinal> is dirty and needs writing
      writeTable[ordinal](target, writer);
    }
    presentBits >>= 1;
    ordinal++;
  }
};
