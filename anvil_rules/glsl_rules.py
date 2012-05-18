# Copyright 2012 Google Inc. All Rights Reserved.

"""GLSL compiler rules for the build system.

Contains the following rules:
compile_glsl
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os

import anvil.async
from anvil.context import RuleContext
from anvil.rule import Rule, build_rule
from anvil.task import Task, NodeExecutableTask
import anvil.util


def _get_template_paths():
  template_path = os.path.join(anvil.util.get_script_path(), 'templates')
  json_template = os.path.join(template_path, 'glsl_json.mustache')
  js_template = os.path.join(template_path, 'glsl_js.mustache')
  return (json_template, js_template)


@build_rule('compile_glsl')
class CompileGlslRule(Rule):
  """GLSL compilation rule.
  Uses the glsl-unit compiler to compile input GLSL files and spit out templated
  files. Each input GLSL file translates to exactly one .json file and .js file.
  The .json file supports runtime loading of the results, while the .js file
  implements the gf.graphics.Program type to make working with the program
  easier.

  Inputs:
    srcs: All source GLSL files.
    compiler_js: Path to a compiler .js file (template_glsl_compiler.js).
    compiler_flags: A list of string compiler flags.
    out: Optional output name. If none is provided than the rule name will be
        used.

  Outputs:
    A single library file. If no out is specified a file with the name of
    the rule will be created.
  """

  def __init__(self, name, compiler_js, compiler_flags=None, out=None,
      *args, **kwargs):
    """Initializes a GLSL compilation rule.

    Args:
      srcs: All source GLSL files.
      compiler_js: Path to a compiler .js file (template_glsl_compiler.js).
      compiler_flags: A list of string compiler flags.
      out: Optional output name. If none is provided than the rule name will be
          used.
    """
    super(CompileGlslRule, self).__init__(name, *args, **kwargs)
    self.compiler_js = compiler_js

    (json_template, js_template) = _get_template_paths()
    self._append_dependent_paths([
        self.compiler_js,
        json_template,
        js_template])

    self.compiler_flags = []
    if compiler_flags:
      self.compiler_flags.extend(compiler_flags)

    self.out = out

  class _Context(RuleContext):
    def begin(self):
      super(CompileGlslRule._Context, self).begin()

      (json_template, js_template) = _get_template_paths()

      args = []
      args.extend(self.rule.compiler_flags)

      # TODO(benvanik): support include paths
      # for include_path in self.include_paths:
      #   rel_path = os.path.relpath(include_path,
      #                              os.path.dirname(self.source_paths[0]))
      #   call_args.append('--glsl_include_prefix=%s' % (rel_path))

      ds = []
      for src_path in self.src_paths:
        json_path = os.path.splitext(self._get_out_path_for_src(src_path))[0]
        json_path += '.json'
        js_path = os.path.splitext(self._get_gen_path_for_src(src_path))[0]
        js_path += '.js'
        self._ensure_output_exists(os.path.dirname(json_path))
        self._ensure_output_exists(os.path.dirname(js_path))
        self._append_output_paths([json_path, js_path])

        # JSON file
        ds.append(self._compile_file(args, src_path, json_path,
                                     json_template))

        # JS file
        rel_json_path = os.path.relpath(json_path, self.build_env.root_path)
        ds.append(self._compile_file(
            args, src_path, js_path, js_template, {
                'json_path': anvil.util.ensure_forwardslashes(rel_json_path)
                }))

      # Kick off compilations
      dg = anvil.async.gather_deferreds(ds, errback_if_any_fail=True)
      self._chain(dg)

    def _compile_file(self, args, src_path, output_path, template_path,
        template_props=None):
      args = list(args)
      args.append('--template=%s' % (template_path))
      args.append('--input=%s' % (src_path))
      args.append('--output=%s' % (output_path))

      if template_props:
        for key in template_props:
          # TODO(benvanik): escape? quote?
          args.append('--template_property=%s=%s' % (key, template_props[key]))

      js_path = self._resolve_input_files([self.rule.compiler_js])[0]
      d = self._run_task_async(NodeExecutableTask(
          self.build_env, js_path, args))
      # TODO(benvanik): pull out (stdout, stderr) from result and the exception
      #     to get better error logging
      return d
