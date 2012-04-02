# Copyright 2012 Google Inc. All Rights Reserved.

"""Build context.

A build context is created to manage the dependency graph and build rules, as
well as handling distribution and execution of the tasks those rules create.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from collections import deque
import multiprocessing

import build
import graph
import project
import time
import util


class Status:
  """Enumeration describing the status of a context."""
  WAITING = 0
  RUNNING = 1
  SUCCEEDED = 2
  FAILED = 3


class BuildEnvironment(object):
  """Build environment settings, containing access to all globals.
  Build environments are a combination of flags passed to the build system
  (from configuration files or the command line), system environment variables,
  and platform options.

  Rule and task implementations should avoid accessing the kind of information
  contained here from anywhere else (such as the sys module), as this ensures
  a consistent environment.

  The build environment should be kept constant throughout a build, and should
  be treated as read-only while in use by a context.
  """

  def __init__(self):
    """Initializes a build environment.
    """
    # TODO(benvanik): cwd for path resolution
    # TODO(benvanik): environment variables
    # TODO(benvanik): user-defined options dict
    pass


class BuildContext(object):
  """A build context for a given project and set of target rules.
  Projects are built by specifying rules that should be considered the
  'targets'. All rules that they depend on are then built, in the proper order,
  to ensure that all dependencies are up to date.

  Build contexts store the runtime definitions of rules, as well as the
  environment they run in.

  Build contexts are designed to be used once and thrown away. To start another
  build create a new context with the same parameters.
  """

  def __init__(self, build_env, project,
               worker_count=2, force=False,
               stop_on_error=False, raise_on_error=False):
    """Initializes a build context.

    Args:
      build_env: Current build environment.
      project: Project to use for building.
      worker_count: Number of worker threads to use when building.
      force: True to force execution of tasks even if they have not changed.
      stop_on_error: True to stop executing tasks as soon as an error occurs.
      raise_on_error: True to rethrow exceptions to ease debugging.
    """
    self.build_env = build_env
    self.project = project

    if not worker_count:
      raise ValueError('Invalid worker count %s' % (worker_count))

    self.worker_count = worker_count
    self.force = force
    self.stop_on_error = stop_on_error
    self.raise_on_error = raise_on_error

    # Build the rule graph
    self.rule_graph = graph.RuleGraph(self.project)

  def execute(self, target_rule_names):
    """Executes all rules in the context.
    Rules are executed in order and, depending on the value of worker_count,
    in parallel when possible.

    Args:
      target_rule_names: A list of rule names that are to be executed.

    Returns:
      TODO

    Raises:
      KeyError: One of the given target rules was not found in the project.
      NameError: An invalid target rule was given.
      TypeError: An invalid target rule was given.
    """
    # Verify that target rules are valid and exist
    target_rule_names = list(target_rule_names)
    util.validate_names(target_rule_names, require_semicolon=True)
    for rule_name in target_rule_names:
      if not self.project.resolve_rule(rule_name):
        raise KeyError('Target rule "%s" not found in project' % (rule_name))

    # Calculate the sequence of rules to execute
    rule_sequence = self.rule_graph.calculate_rule_sequence(target_rule_names)

    # Execute all rules in order
    # TODO(benvanik): make this execution multithreaded (see notes below)
    any_failed = False
    remaining_rules = deque(rule_sequence)
    while len(remaining_rules):
      rule = remaining_rules.popleft()
      start_time = time.clock()
      result = self.execute_rule(rule)
      duration = time.clock() - start_time
      if not result:
        any_failed = True
      if any_failed and self.stop_on_error:
        break

    return any_failed

  def execute_rule(self, rule):
    """
    """
    pass

# TODO(benvanik): multiprocessing work
# Requires basic checks for dependency of in-flight rules to ensure parallel
# processing is possible.
# Rule instances should be easily portable to worker threads (just metadata),
# however synchronizing logging and things like aborting require work.
#
# run the list in order:
# remaining_rules = deque(rule_sequence)
# in_flight_rules = []
# def pump():
#   while len(in_flight_rules) < max_workers and len(remaining_rules):
#     next_rule = remaining_rules[0]
#     for in_flight_rule in in_flight_rules:
#       if graph.has_dependency(next_rule.path, in_flight_rules.path):
#         blocked!
#         return
#       else:
#         runnable!
#         remaining_rules.popleft()
#         in_flight_rules.append(next_rule)
#         kick off worker with rule
#   if not len(in_flight_rules) and not len(remaining_rules):
#     done!
#
# # TODO(benvanik): use multiprocessing.cpu_count() or command line args to
# #                 pick the CPU count - right now, this will log a bunch of
# #                 warnings if we run with too many processes on cygwin
# mp_pool = multiprocessing.Pool(processes=worker_count)
# mp_results = []
# for rule in self.rule_sequence:
#   # Queue the rule
#   mp_results.append(mp_pool.apply_async(
#       self._execute_rule, (rule)))
# # Gather results
# for result in mp_results:
#   result.wait()
# mp_pool.close()


class RuleContext(object):
  """A runtime context for an individual rule.
  """

  def __init__(self, build_context, rule, *args, **kwargs):
    """
    Args:
      build_context: Active build context.
      rule: Rule this context wraps.
    """
    self.build_context = build_context
    self.rule = rule

    self.status = Status.WAITING
    self.start_time = None
    self.end_time = None

    # TODO(benvanik): logger
    self.logger = None

    self.tasks = []

    self.all_input_files = self._gather_input_files()
    #self.file_delta = FileDelta()
    #self.all_output_files = []

  def _gather_input_files(self):
    pass


class Task(object):
  """
  """

  def __init__(self, rule_context):
    pass


class FileDelta(object):
  """
  TODO(benvanik): move to another module and setup to use cache
  """

  def __init__(self, source_paths=None):
    """
    Args:
      source_paths
    """
    self.all_files = []
    self.added_files = []
    self.removed_files = []
    self.changed_files = []
