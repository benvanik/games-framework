# Copyright 2012 Google Inc. All Rights Reserved.

"""Message definition rules for the build system.

Contains the following rules:
compile_msg
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


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
  js_template = os.path.join(template_path, 'msg_js.mako')
  return (js_template)


@build_rule('compile_msg')
class CompileMsgRule(Rule):
  """Message file compilation and code gen rule.
  Will parse and generate message (.msg) files.
  Each input image translates to exactly one .js file.

  Inputs:
    srcs: All source msg files.

  Outputs:
    A .js file for each input file.
  """

  def __init__(self, name, *args, **kwargs):
    """Initializes a message compilation rule.

    Args:
      srcs: All source msg files.
    """
    super(CompileMsgRule, self).__init__(name, *args, **kwargs)

    (js_template) = _get_template_paths()
    self._append_dependent_paths([
        js_template])

  class _Context(RuleContext):
    def begin(self):
      super(CompileMsgRule._Context, self).begin()

      import msg.parser
      (js_template) = _get_template_paths()

      ds = []
      for src_path in self.src_paths:
        js_path = os.path.splitext(self._get_gen_path_for_src(src_path))[0]
        js_path += '.js'
        self._ensure_output_exists(os.path.dirname(js_path))
        self._append_output_paths([js_path])

        # TODO(benvanik): move parsing to another task
        message_file = msg.parser.parse(src_path)

        ds.append(self._run_task_async(MakoTemplateTask(
            self.build_env, js_path, js_template, {
                'file': message_file,
                })))

      # Kick off optimizations
      dg = anvil.async.gather_deferreds(ds, errback_if_any_fail=True)
      self._chain(dg)
