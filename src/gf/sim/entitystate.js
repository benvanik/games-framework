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

goog.require('gf.sim.Variable');
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
   * @protected
   * @type {!gf.sim.Entity}
   */
  this.entity = entity;

  /**
   * State time, if the state is historical.
   * This is used by the client-side interpolation system and server-side
   * rewinding.
   * @type {number}
   */
  this.time = 0;

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
 * Resets the entity state.
 * Used when pooling states.
 * @param {!gf.sim.Entity} entity Target entity.
 */
gf.sim.EntityState.prototype.reset = function(entity) {
  this.entity = entity;
  this.time = 0;
  this.dirtyBits00_31_ = 0;
  this.dirtyBits32_63_ = 0;
};


/**
 * Gets the shared variable table for {@see gf.sim.EntityState} types.
 * @param {!function(!Array.<!gf.sim.Variable>)} declarationFunction
 *     Entity state variable declaration function.
 * @return {!gf.sim.VariableTable} A shared variable table.
 */
gf.sim.EntityState.getVariableTable = function(declarationFunction, obj) {
  if (!declarationFunction.variableTable_) {
    var variableList = [];
    declarationFunction(variableList);
    declarationFunction.variableTable_ = new gf.sim.VariableTable(
        variableList, obj);
  }
  return declarationFunction.variableTable_;
};


/**
 * Adds all variables of this type and its parents.
 * Order is not important.
 * @protected
 * @param {!Array.<!gf.sim.Variable>} variableList A list of variables to add
 *     this types variables to.
 */
gf.sim.EntityState.declareVariables = goog.nullFunction;


/**
 * Sets the given variable ordinal as dirty.
 * The variable will be written in the next delta write. Use
 * {@see #resetDirtyState} to reset the bits.
 * @param {number} ordinal Variable ordinal.
 */
gf.sim.EntityState.prototype.setVariableDirty = function(ordinal) {
  var wasDirty = this.dirtyBits00_31_ || this.dirtyBits32_63_;
  if (ordinal <= 31) {
    this.dirtyBits00_31_ |= 1 << ordinal;
  } else {
    this.dirtyBits32_63_ |= 1 << (ordinal - 32);
  }
  if (!wasDirty) {
    this.entity.invalidate();
  }
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
  var presentBits00_31 = reader.readVarUint();
  this.variableTable_.readPresentVariables(
      0, presentBits00_31, this, reader);

  // Write the next 32, if present
  if (this.variableTable_.getCount() > 31) {
    var presentBits32_63 = reader.readVarUint();
    this.variableTable_.readPresentVariables(
        32, presentBits32_63, this, reader);
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
  writer.writeVarUint(this.dirtyBits00_31_);
  this.variableTable_.writePresentVariables(
      0, this.dirtyBits00_31_, this, writer);

  // Write the next 32, if present
  if (this.dirtyBits32_63_ && this.variableTable_.getCount() > 31) {
    writer.writeVarUint(this.dirtyBits32_63_);
    this.variableTable_.writePresentVariables(
        32, this.dirtyBits32_63_, this, writer);
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
 * Copies all unpredicted/uninterpolated values of this state to the target
 * state.
 * @param {!gf.sim.EntityState} targetState Target state.
 */
gf.sim.EntityState.prototype.copyImmediateVariables = function(targetState) {
  this.variableTable_.copyImmediateVariables(this, targetState);
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
 * Copies values of all interpolated variables to the target state.
 * All values in the target state with their
 * {@see gf.sim.VariableFlag#INTERPOLATED} bit set will get overwritten with
 * this states values.
 * @param {!gf.sim.EntityState} targetState Target state.
 */
gf.sim.EntityState.prototype.copyInterpolatedVariables = function(targetState) {
  this.variableTable_.copyInterpolatedVariables(this, targetState);
};


/**
 * Interpolates variables between two states.
 * All values with {@see gf.sim.VariableFlag#INTERPOLATED} set will be
 * interpolated between the source and target by the given time. The result
 * will be stored in this state.
 * @param {!gf.sim.EntityState} sourceState Interpolation source object.
 * @param {!gf.sim.EntityState} targetState Interpolation target object.
 * @param {number} t Interpolation coefficient, [0-1].
 */
gf.sim.EntityState.prototype.interpolate = function(
    sourceState, targetState, t) {
  var vtable = this.variableTable_;
  if (this.entity.getFlags() & gf.sim.EntityFlag.PREDICTED) {
    vtable.interpolateUnpredictedVariables(sourceState, targetState, t, this);
  } else {
    vtable.interpolateVariables(sourceState, targetState, t, this);
  }
};


// TODO(benvanik): find a way to remove these - point at an indirection table?
/**
 * Scratch Vec3 for math.
 * This is currently used by the variable table system.
 * @protected
 * @type {!goog.vec.Vec3.Float32}
 */
gf.sim.EntityState.prototype.tmpVec3 = gf.sim.Variable.tmpVec3;


/**
 * Scratch Quaternion for math.
 * This is currently used by the variable table system.
 * @protected
 * @type {!goog.vec.Quaternion.Float32}
 */
gf.sim.EntityState.prototype.tmpQuat = gf.sim.Variable.tmpQuat;


/**
 * Quaternion slerp.
 * This is currently used by the variable table system.
 * @protected
 * @type {!Function}
 */
gf.sim.EntityState.prototype.qslerp = goog.vec.Quaternion.slerp;


/**
 * Color lerp.
 * This is currently used by the variable table system.
 * @protected
 * @type {!Function}
 */
gf.sim.EntityState.prototype.colorLerp = gf.vec.Color.lerpUint32;

// HACK: ensure things are included
goog.scope(function() {
gf.sim.EntityState.prototype.tmpVec3[0] =
    gf.sim.EntityState.prototype.tmpVec3[1];
gf.sim.EntityState.prototype.qslerp(
    gf.sim.EntityState.prototype.tmpQuat,
    gf.sim.EntityState.prototype.tmpQuat,
    0,
    gf.sim.EntityState.prototype.tmpQuat);
gf.sim.EntityState.prototype.colorLerp(0, 0, 0);
});  // goog.scope
