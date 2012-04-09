# Copyright 2012 Google Inc. All Rights Reserved.

"""Common command utilities.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import argparse

from build.context import BuildEnvironment, BuildContext
from build.project import FileModuleResolver, Project
from build.task import InProcessTaskExecutor, MultiProcessTaskExecutor


def add_common_args(parser):
  """Adds common system arguments to an argument parser.

  Args:
    parser: ArgumentParser to modify.
  """
  # TODO(benvanik): logging control/etc
  pass


def add_common_build_args(parser, targets=False):
  """Adds common build arguments to an argument parser.

  Args:
    parser: ArgumentParser to modify.
    targets: True to add variable target arguments.
  """
  # Threading/execution control
  parser.add_argument('-j', '--jobs',
                      dest='jobs',
                      type=int,
                      default=None,
                      help=('Specifies the number of tasks to run '
                            'simultaneously. If omitted then all processors '
                            'will be used.'))

  # Build context control
  parser.add_argument('-f', '--force',
                      dest='force',
                      action='store_true',
                      default=False,
                      help=('Force a full rebuild by cleaning all output '
                            'and clearing the cache before building.'))
  parser.add_argument('--stop_on_error',
                      dest='stop_on_error',
                      action='store_true',
                      default=False,
                      help=('Stop building when an error is encountered.'))

  # Target specification
  if targets:
    parser.add_argument('targets',
                        nargs='+',
                        metavar='target',
                        help='Target build rule (such as :a or foo/bar:a)')


def run_build(cwd, parsed_args):
  build_env = BuildEnvironment(root_path=cwd)

  module_resolver = FileModuleResolver(cwd)
  project = Project(module_resolver=module_resolver)

  # -j/--jobs switch to change execution mode
  # TODO(benvanik): force -j 1 on Cygwin?
  if parsed_args.jobs == 1:
    task_executor = InProcessTaskExecutor()
  else:
    task_executor = MultiProcessTaskExecutor(worker_count=parsed_args.jobs)

  # TODO(benvanik): good logging/info - resolve rules in project and print
  #     info?
  print 'building %s' % (parsed_args.targets)

  # TODO(benvanik): take additional args from command line
  all_target_outputs = set([])
  with BuildContext(build_env, project,
                    task_executor=task_executor,
                    force=parsed_args.force,
                    stop_on_error=parsed_args.stop_on_error,
                    raise_on_error=False) as build_ctx:
    result = build_ctx.execute_sync(parsed_args.targets)
    if result:
      for target in parsed_args.targets:
        (state, target_outputs) = build_ctx.get_rule_results(target)
        all_target_outputs.update(target_outputs)

  return (result == True, all_target_outputs)
