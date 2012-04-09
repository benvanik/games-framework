# Copyright 2012 Google Inc. All Rights Reserved.

"""Management shell 'build' command.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import argparse
import os
import sys

from build.context import BuildEnvironment, BuildContext
from build.manage import manage_command
from build.project import FileModuleResolver, Project
from build.task import InProcessTaskExecutor, MultiProcessTaskExecutor


def _get_options_parser():
  """Gets an options parser for the given args."""
  parser = argparse.ArgumentParser(prog='manage.py build')
  parser.add_argument('targets',
                      nargs='+',
                      metavar='target',
                      help='Target build rule (such as :a or foo/bar:a)')
  return parser


@manage_command('build')
def build(args, cwd):
  parser = _get_options_parser()
  parsed_args = parser.parse_args(args)

  build_env = BuildEnvironment(root_path=cwd)

  module_resolver = FileModuleResolver(cwd)
  project = Project(module_resolver=module_resolver)

  # TODO(benvanik): -j
  task_executor = InProcessTaskExecutor()
  #task_executor = MultiProcessTaskExecutor(worker_count=None)

  # TODO(benvanik): good logging/info - resolve rules in project and print
  #     info?
  print 'building %s' % (parsed_args.targets)

  # TODO(benvanik): take additional args from command line
  with BuildContext(build_env, project,
                    task_executor=task_executor,
                    force=False,
                    stop_on_error=False,
                    raise_on_error=False) as build_ctx:
    result = build_ctx.execute_sync(parsed_args.targets)

  return result == True
