goog.provide('${state.name}');

goog.require('gf');
goog.require('gf.sim');
goog.require('gf.sim.EntityState');
goog.require('gf.sim.Variable');
goog.require('gf.sim.VariableFlag');
goog.require('goog.vec.Mat3');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Quaternion');
goog.require('goog.vec.Vec3');
goog.require('goog.vec.Vec4');
goog.require('${state.super}');



/**
 * Source: ${state.src_path}
 * @constructor
 * @extends {${state.super}}
 * @param {!gf.sim.Entity} entity Entity that this object stores state for.
 * @param {gf.sim.VariableTable=} opt_variableTable A subclass's variable table.
 */
${state.name} = function(entity, opt_variableTable) {
  var variableTable = opt_variableTable || gf.sim.EntityState.getVariableTable(
      ${state.name}.declareVariables);
  goog.base(this, entity, variableTable);
  % for i, var in enumerate(state.vars):

  /**
   * @private
   * @type {!${var.type['closure_type']}}
   */
  this.${var.name}_ = ${var.type['default_value']};

  % if var.entity_type:
  /**
   * @private
   * @type {${var.entity_type}|undefined}
   */
  this.${var.name}Entity_ = undefined;
  % endif
  /**
   * @private
   * @type {number}
   */
  this.${var.name}Ordinal_ = variableTable.getOrdinal(
      ${state.name}.tags_.${var.name});
  % endfor
};
goog.inherits(${state.name}, ${state.super});


% if len(state.vars):
/**
 * @private
 * @type {!Object.<number>}
 */
${state.name}.tags_ = {
% for i, var in enumerate(state.vars):
  ${var.name}: gf.sim.Variable.getUniqueTag()\
  % if i != len(state.vars) - 1:
,
  % else:

  % endif
% endfor
};
% endif
% for i, var in enumerate(state.vars):


/**
 * Gets the value of ${var.name}.
 * @return {!${var.type['closure_type']}} Current value.
 */
${state.name}.prototype.get${var.cap_name} = function() {
  return this.${var.name}_;
};
% if var.entity_type:
/**
 * Gets a cached entity reference for ${var.name}.
 * @return {${var.entity_type}} Current value.
 */
${state.name}.prototype.get${var.cap_name}Entity = function() {
  if (this.${var.name}Entity_ === undefined) {
    if (!this.${var.name}_) {
      this.${var.name}Entity_ = null;
    } else {
      this.${var.name}Entity_ = this.entity.getSimulator().getEntity(this.${var.name}_);
    }
  }
  return this.${var.name}Entity_;
};
% endif


/**
 * Sets the value of ${var.name}.
 * @param {!${var.type['closure_type']}} value New value.
 */
${state.name}.prototype.set${var.cap_name} = function(value) {
  % if var.type['is_primitive']:
  if (this.${var.name}_ != value) {
    this.${var.name}_ = value;
    this.setVariableDirty(this.${var.name}Ordinal_);
    ${var.onchange}
    % if var.entity_type:
    this.${var.name}Entity_ = undefined;
    % endif
  }
  % else:
  if (!${var.type['compare_fn']}(this.${var.name}_, value)) {
    ${var.type['setter_fn']}(this.${var.name}_, value);
    this.setVariableDirty(this.${var.name}Ordinal_);
    ${var.onchange}
  }
  % endif
};
% endfor


/**
 * @override
 */
${state.name}.declareVariables = function(variableList) {
  ${state.super}.declareVariables(variableList);
  % for i, var in enumerate(state.vars):
  variableList.push(new gf.sim.Variable.${var.type['name']}(
      ${state.name}.tags_.${var.name},
      ${var.flags},
      ${state.name}.prototype.get${var.cap_name},
      ${state.name}.prototype.set${var.cap_name}\
      % if var.extra_args:
, ${var.extra_args}\
      % endif
));
  % endfor
};
