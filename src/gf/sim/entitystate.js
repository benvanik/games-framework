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

goog.provide('gf.sim.EntityState');

goog.require('gf.sim.VariableTable');
goog.require('goog.asserts');



/**
 * Entity state.
 * Stores all state (variables) for an entity. Used to enable replication,
 * interpolation, prediction, and latency compensation. All non-constant
 * variables of entities that need any of these features must be on this type.
 *
 * Both server and client state must be identical in every way.
 *
 * @constructor
 * @param {!gf.sim.Entity} entity Entity that this object stores state for.
 * @param {!gf.sim.VariableTable} variableTable A subclass's variable table.
 */
gf.sim.EntityState = function(entity, variableTable) {
  /**
   * Entity that this object stores state for.
   * The target entity will be invalidated when the state changes.
   * @private
   * @type {!gf.sim.Entity}
   */
  this.entity_ = entity;

  /**
   * Table for variable handling.
   * This should be the table containing all variables for the entire type
   * chain.
   * @private
   * @type {!gf.sim.VariableTable}
   */
  this.variableTable_ = variableTable;

  /**
   * Bitmask of dirty variables, covering ordinals 0-31.
   * Bits are set by setter functions when dirtying values and reset explicitly
   * with the {@see #resetDirtyState} function.
   * @private
   * @type {number}
   */
  this.dirtyBits00_31_ = 0;

  /**
   * Bitmask of dirty variables, covering ordinals 32-63.
   * This is only used if needed.
   * @private
   * @type {number}
   */
  this.dirtyBits32_63_ = 0;

  // Only support 64 variables right now
  // Need more? Add more bit sets (shouldn't cost much but some extra sets)
  goog.asserts.assert(this.variableTable_.getCount() <= 63);
};


/**
 * Gets the shared variable table for {@see gf.sim.EntityState} types.
 * @param {!Function} type Entity state type.
 * @return {!gf.sim.VariableTable} A shared variable table.
 */
gf.sim.EntityState.getVariableTable = function(type) {
  if (!type.variableTable_) {
    var variableList = [];
    type.declareVariables(variableList);
    type.variableTable_ = new gf.sim.VariableTable(variableList);
  }
  return type.variableTable_;
};


/**
 * Adds all variables of this type and its parents.
 * Order is not important.
 * @param {!Array.<!gf.sim.Variable>} variableList A list of variables to add
 *     this types variables to.
 */
gf.sim.EntityState.declareVariables = goog.abstractMethod;


/**
 * Sets the given variable ordinal as dirty.
 * The variable will be written in the next delta write. Use
 * {@see #resetDirtyState} to reset the bits.
 * @param {number} ordinal Variable ordinal.
 */
gf.sim.EntityState.prototype.setVariableDirty = function(ordinal) {
  if (ordinal <= 31) {
    this.dirtyBits00_31_ |= 1 << ordinal;
  } else {
    this.dirtyBits32_63_ |= 1 << (ordinal - 32);
  }
  this.entity_.invalidate();
};


/**
 * Resets the dirty variable tracking flags for the state.
 * Call this after writes to begin tracking again.
 */
gf.sim.EntityState.prototype.resetDirtyState = function() {
  this.dirtyBits00_31_ = this.dirtyBits32_63_ = 0;
};


/**
 * Reads an entire entity state from the given reader.
 * @param {!gf.net.PacketReader} reader Packet reader.
 */
gf.sim.EntityState.prototype.read = function(reader) {
  this.variableTable_.readAllVariables(this, reader);
};


/**
 * Reads a variable delta description of the entity state.
 * The delta must have been written with {@see #writeDelta}.
 */
gf.sim.EntityState.prototype.readDelta = function(reader) {
  // Read the first 32 variables
  this.readDeltaVariables_(reader, 0);

  // Write the next 32, if present
  if (this.variableTable_.getCount() > 31) {
    this.readDeltaVariables_(reader, 32);
  }
};


/**
 * Reads a range of delta variables.
 * This function is designed to be called on a subset of the variable range.
 * For example, the first 32 variables, second 32, etc.
 * @private
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @param {number} startingOrdinal Ordinal this range starts at.
 */
gf.sim.EntityState.prototype.readDeltaVariables_ = function(
    reader, startingOrdinal) {
  // Read bits indicating which variables are present
  var presentBits = reader.readVarInt();

  // For each bit that is present, read the value
  var ordinal = startingOrdinal;
  while (presentBits) {
    if (presentBits & 1) {
      // Variable at <ordinal> is present and needs reading
      this.variableTable_.readVariable(ordinal, this, reader);
    }
    presentBits >>= 1;
    ordinal++;
  }
};


/**
 * Writes an entire entity state to the given writer.
 * This call is not effected by the dirty state and does not reset it.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.EntityState.prototype.write = function(writer) {
  this.variableTable_.writeAllVariables(this, writer);
};


/**
 * Writes a variable delta description of the entity state.
 * The delta can only be read with a call to {@see #readDelta}.
 * Only those variables that have been changed since the last call to
 * {@see resetDirtyState} will be serialized. An explicit call to
 * {@see resetDirtyState} is required after this method.
 * @param {!gf.net.PacketWriter} writer Packet writer.
 */
gf.sim.EntityState.prototype.writeDelta = function(writer) {
  // Do not reset dirty bits in this function - they must be explicitly
  // reset with {@see #resetDirtyState} - this enables multiple writes of a
  // delta

  // Write the first 32 variables
  this.writeDeltaVariables_(writer, this.dirtyBits00_31_, 0);

  // Write the next 32, if present
  if (this.dirtyBits32_63_ && this.variableTable_.getCount() > 31) {
    this.writeDeltaVariables_(writer, this.dirtyBits32_63_, 32);
  }
};


/**
 * Writes a range of delta variables.
 * This function is designed to be called on a subset of the variable range.
 * For example, the first 32 variables, second 32, etc.
 * @private
 * @param {!gf.net.PacketWriter} writer Packet writer.
 * @param {number} presentBits Bit field indicating which variables are present.
 * @param {number} startingOrdinal Ordinal this range starts at.
 */
gf.sim.EntityState.prototype.writeDeltaVariables_ = function(
    writer, presentBits, startingOrdinal) {
  // Write dirty bits
  writer.writeVarInt(presentBits);

  // For each bit that is dirty, write the value
  var ordinal = startingOrdinal;
  while (presentBits) {
    if (presentBits & 1) {
      // Variable at <ordinal> is dirty and needs writing
      this.variableTable_.writeVariable(ordinal, this, writer);
    }
    presentBits >>= 1;
    ordinal++;
  }
};


/**
 * Copies all values of this state to the target state.
 * @param {!gf.sim.EntityState} targetState Target state.
 */
gf.sim.EntityState.prototype.copy = function(targetState) {
  this.variableTable_.copyVariables(this, targetState);
};


/**
 * Copies values of all predicted variables to the target state.
 * All values in the target state with their
 * {@see gf.sim.VariableFlag#PREDICTED} bit set will get overwritten with this
 * states values. This is used to prepare a state for the execution of
 * client-side prediction commands.
 * @param {!gf.sim.EntityState} targetState Target state.
 */
gf.sim.EntityState.prototype.copyPredictedVariables = function(targetState) {
  this.variableTable_.copyPredictedVariables(this, targetState);
};


/**
 * Interpolates variables between two states.
 * All values with {@see gf.sim.VariableFlag#INTERPOLATED} set will be
 * interpolated between the source and target by the given time. The result
 * will be stored in this state.
 * @param {!gf.sim.EntityState} source Interpolation source object.
 * @param {!gf.sim.EntityState} target Interpolation target object.
 * @param {number} t Interpolation coefficient, [0-1].
 */
gf.sim.EntityState.prototype.interpolate = function(sourceState, targetState,
    t) {
  this.variableTable_.interpolateVariables(sourceState, targetState, t, this);
};
