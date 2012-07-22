# Copyright 2012 Google Inc. All Rights Reserved.

"""Simulator state rules for the build system.

Contains the following rules:
compile_simstate
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import io
import json
import os
import sys

import anvil.async
from anvil.context import RuleContext
from anvil.rule import Rule, build_rule
from anvil.task import Task, MakoTemplateTask
import anvil.util

# Enable importing local modules
sys.path.append(anvil.util.get_script_path())


def _get_template_paths():
  template_path = os.path.join(anvil.util.get_script_path(), 'templates')
  js_template = os.path.join(template_path, 'simstate_js.mako')
  return (js_template)


SIM_TYPES_ = {
  'Integer': {
    'name': 'Integer',
    'is_primitive': True,
    'closure_type': 'number',
    'default_value': '0',
  },
  'Float': {
    'name': 'Float',
    'is_primitive': True,
    'closure_type': 'number',
    'default_value': '0',
  },
  'Vec3': {
    'name': 'Vec3',
    'is_primitive': False,
    'closure_type': 'goog.vec.Vec3.Float32',
    'default_value': 'goog.vec.Vec3.createFloat32()',
    'compare_fn': 'goog.vec.Vec3.equals',
    'setter_fn': 'goog.vec.Vec3.setFromArray',
  },
  'Quaternion': {
    'name': 'Quaternion',
    'is_primitive': False,
    'closure_type': 'goog.vec.Quaternion.Float32',
    'default_value': 'goog.vec.Quaternion.createFloat32()',
    'compare_fn': 'goog.vec.Vec4.equals',
    'setter_fn': 'goog.vec.Quaternion.setFromArray',
    'extra_args': ['normalized',],
  },
  'Color': {
    'name': 'Color',
    'is_primitive': True,
    'closure_type': 'number',
    'default_value': '0x00000000',
  },
  'String': {
    'name': 'String',
    'is_primitive': True,
    'closure_type': 'string',
    'default_value': '\'\'',
  },
  'EntityID': {
    'name': 'EntityID',
    'is_primitive': True,
    'closure_type': 'number',
    'default_value': '0',
  },
}


class SimVar(object):
  """Sim state variable.
  """

  def __init__(self, json, *args, **kwargs):
    """Initializes a sim state varioable from the given JSON dict.

    Args:
      json: JSON dict.
    """
    super(SimVar, self).__init__(*args, **kwargs)

    self.json = json
    self.name = json['name']
    self.cap_name = self.name[0:1].capitalize() + self.name[1:]
    self.type = SIM_TYPES_[json['type']]
    self.flags = self._parse_flags(json.get('flags', []))
    self.onchange = json.get('onchange', '')
    self.extra_args = ''
    if self.type.get('extra_args', None):
      for arg_name in self.type['extra_args']:
        if len(self.extra_args):
          self.extra_args += ', '
        value = json.get(arg_name, 'undefined')
        if value == True:
          value = 'true'
        elif value == False:
          value = 'false'
        self.extra_args += value

  def _parse_flags(self, flags):
    """Parses a list of string flags and returns a string bitmask.

    Args:
      flags: A list of string flags.

    Returns:
      A string containing a bitmask of the given flags.
    """
    s = ''
    for flag in flags:
      if len(s):
        s += ' | '
      s += 'gf.sim.VariableFlag.%s' % (flag)
    if len(s):
      return s
    else:
      return '0'


class SimState(object):
  """Sim state model.
  """

  def __init__(self, src_path, json, *args, **kwargs):
    """Initializes a sim state model from the given JSON dict.

    Args:
      src_path: Source file path.
      json: JSON dict.
    """
    super(SimState, self).__init__(*args, **kwargs)

    self.src_path = src_path
    self.json = json
    self.name = json['name']
    self.super = json['super']

    self.vars = []
    for json_var in json['vars']:
      self.vars.append(SimVar(json_var))


@build_rule('compile_simstate')
class CompileSimStateRule(Rule):
  """Sim state file compilation and code gen rule.
  Will parse and generate simstate (.simstate) files.
  Each input sim state translates to exactly one .js file.

  Inputs:
    srcs: All source simstate files.

  Outputs:
    A .js file for each input file.
  """

  def __init__(self, name, *args, **kwargs):
    """Initializes a sim state compilation rule.

    Args:
      srcs: All source simstate files.
    """
    super(CompileSimStateRule, self).__init__(name, *args, **kwargs)

    (js_template) = _get_template_paths()
    self._append_dependent_paths([
        js_template])

  class _Context(RuleContext):
    def begin(self):
      super(CompileSimStateRule._Context, self).begin()

      (js_template) = _get_template_paths()

      ds = []
      for src_path in self.src_paths:
        js_path = os.path.splitext(self._get_gen_path_for_src(src_path))[0]
        js_path += 'state.js'
        self._ensure_output_exists(os.path.dirname(js_path))
        self._append_output_paths([js_path])

        # TODO(benvanik): move parsing to another task
        with io.open(src_path) as f:
          file_str = f.read()
        simstate_json = json.loads(file_str)
        simstate = SimState(src_path, simstate_json)

        ds.append(self._run_task_async(MakoTemplateTask(
            self.build_env, js_path, js_template, {
                'state': simstate,
                })))

      # Kick off optimizations
      dg = anvil.async.gather_deferreds(ds, errback_if_any_fail=True)
      self._chain(dg)
