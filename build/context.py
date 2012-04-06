# Copyright 2012 Google Inc. All Rights Reserved.

"""Build context.

A build context is created to manage the dependency graph and build rules, as
well as handling distribution and execution of the tasks those rules create.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from collections import deque
import fnmatch
import glob2
import itertools
import multiprocessing
import os
import time

from async import Deferred
import build
import graph
import project
import task
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

  This object may be passed to other processes, and must be pickeable.
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
               task_executor=None, force=False,
               stop_on_error=False, raise_on_error=False):
    """Initializes a build context.

    Args:
      build_env: Current build environment.
      project: Project to use for building.
      task_executor: Task executor to use. One will be created if none is
          passed.
      force: True to force execution of tasks even if they have not changed.
      stop_on_error: True to stop executing tasks as soon as an error occurs.
      raise_on_error: True to rethrow exceptions to ease debugging.
    """
    self.build_env = build_env
    self.project = project

    self.task_executor = task_executor
    self._close_task_executor = False
    if not self.task_executor:
      #self.task_executor = task.InProcessTaskExecutor()
      self.task_executor = task.MultiProcessTaskExecutor()
      self._close_task_executor = True

    self.force = force
    self.stop_on_error = stop_on_error
    self.raise_on_error = raise_on_error

    # Build the rule graph
    self.rule_graph = graph.RuleGraph(self.project)

    # Dictionary that should be used to map rule paths to RuleContexts
    self.rule_contexts = {}

  def __enter__(self):
    return self

  def __exit__(self, type, value, traceback):
    if self._close_task_executor:
      self.task_executor.close()

  def execute(self, target_rule_names):
    """Executes all rules in the context.
    Rules are executed in order and where possible in parallel.

    Args:
      target_rule_names: A list of rule names that are to be executed.

    Returns:
      A Deferred that completes when all rules have completed. If an error
      occurs in any rule an errback will be called.

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

    any_failed = [False]
    main_deferred = Deferred()
    remaining_rules = deque(rule_sequence)
    in_flight_rules = []

    def _issue_rule(rule):
      """Issues a single rule into the current execution context.
      Updates the in_flight_rules list and pumps when the rule completes.

      Args:
        rule: Rule to issue.
      """
      def _rule_callback(*args, **kwargs):
        in_flight_rules.remove(rule)
        _pump(previous_succeeded=True)

      def _rule_errback(*args, **kwargs):
        in_flight_rules.remove(rule)
        # TODO(benvanik): log result/exception/etc?
        _pump(previous_succeeded=False)

      in_flight_rules.append(rule)
      rule_deferred = self._execute_rule(rule)
      rule_deferred.add_callback_fn(_rule_callback)
      rule_deferred.add_errback_fn(_rule_errback)
      return rule_deferred

    def _pump(previous_succeeded=True):
      """Attempts to run another rule and signals the main_deferred if done.

      Args:
        previous_succeeded: Whether the previous rule succeeded.
      """
      # If we're already done, gracefully exit
      if main_deferred.is_done():
        return

      # If we failed and we are supposed to stop, gracefully stop by
      # killing all future rules
      # This is better than terminating immediately, as it allows legit tasks
      # to finish
      if not previous_succeeded:
        any_failed[0] = True
      if not previous_succeeded and self.stop_on_error:
        remaining_rules.clear()

      if len(remaining_rules):
        # Peek the next rule
        next_rule = remaining_rules[0]

        # See if it has any dependency on currently running rules
        for in_flight_rule in in_flight_rules:
          if self.rule_graph.has_dependency(next_rule.path,
                                            in_flight_rule.path):
            # Blocked on a previous rule, so pass and wait for the next pump
            return

        # If here then we found no conflicting rules, so run!
        remaining_rules.popleft()
        _issue_rule(next_rule)
      else:
        # Done!
        # TODO(benvanik): better errbacks? some kind of BuildResults?
        if not any_failed[0]:
          main_deferred.callback()
        else:
          main_deferred.errback()

    # Kick off execution (once for each rule as a heuristic for flooding the
    # pipeline)
    for rule in rule_sequence:
      _pump()

    return main_deferred

  def wait(self, deferreds):
    """Blocks waiting on a list of deferreds until they all complete.
    The deferreds must have been returned from execute.

    Args:
      deferreds: A list of Deferreds (or one).
    """
    self.task_executor.wait(deferreds)

  def _execute_rule(self, rule):
    """Executes a single rule.
    This assumes that all dependent rules have already been executed. Assertions
    will be raised if all dependent rules have not completed successfully or
    if the given rule has been executed already.

    Args:
      rule: Rule to execute.

    Returns:
      A Deferred that will callback when the rule has completed executing.
    """
    assert not self.rule_contexts.has_key(rule.path)
    rule_ctx = rule.create_context(self)
    self.rule_contexts[rule.path] = rule_ctx
    if rule_ctx.check_predecessor_failures():
      return rule_ctx.cascade_failure()
    else:
      return rule_ctx.begin()

  def get_rule_results(self, rule):
    """Gets the status/output of a rule.
    This is not thread safe and should only be used to query the result of a
    rule after it has been run.

    Args:
      rule: Rule to query - can be a Rule object or a rule path that will be
          resolved.

    Returns:
      A tuple containing (status, output_paths) for the given rule.

    Raises:
      KeyError: The rule was not found.
    """
    if isinstance(rule, str):
      rule = self.project.resolve_rule(rule)
    if self.rule_contexts.has_key(rule.path):
      rule_ctx = self.rule_contexts[rule.path]
      return (rule_ctx.status, rule_ctx.all_output_files[:])
    else:
      return (Status.WAITING, [])

  def get_rule_outputs(self, rule):
    """Gets the output files of the given rule.
    It is only valid to call this on rules that have already been executed
    and have succeeded.

    Args:
      rule: Rule to query - can be a Rule object or a rule path that will be
          resolved.

    Returns:
      A list of all output files from the rule or None if the rule did not yet
      execute.
    Raises:
      KeyError: The rule was not found.
    """
    results = self.get_rule_results(rule)
    return results[1]


class RuleContext(object):
  """A runtime context for an individual rule.
  Must contain all of the state for a rule while it is being run, including
  all resolved inputs and resulting outputs (once complete).
  """

  def __init__(self, build_context, rule, *args, **kwargs):
    """Initializes a rule context.

    Args:
      build_context: BuildContext this rule is running in.
      rule: Rule this context wraps.
    """
    self.build_context = build_context
    self.rule = rule

    self.deferred = Deferred()
    self.status = Status.WAITING
    self.start_time = None
    self.end_time = None
    self.exception = None

    # TODO(benvanik): logger
    self.logger = None

    # The fully resolved (and de-duped) list of all files from srcs
    self.all_input_files = self._gather_input_files()

    # This list of all files this rule outputted, upon completion
    self.all_output_files = []

  def _gather_input_files(self):
    """Gathers and returns a list of all files that a rule needs based on srcs.
    This adds direct file references, recursively enumerates paths, expands
    globs, and grabs outputs from other rules.

    Returns:
      A list of all file paths from srcs.

    Raises:
      KeyError: A required rule was not found.
      OSError: A source path was not found or could not be accessed.
      RuntimeError: Internal runtime error (rule executed out of order/etc)
    """
    base_path = os.path.dirname(self.rule.parent_module.path)
    input_paths = set([])
    for src in self.rule.srcs:
      # Grab all items from the source
      src_items = None
      if util.is_rule_path(src):
        # Reference to another rule
        other_rule = self.build_context.project.resolve_rule(
            src, requesting_module=self.rule.parent_module)
        if not other_rule:
          raise KeyError('Source rule "%s" not found' % (src))
        if not self.build_context.rule_contexts.has_key(other_rule.path):
          raise RuntimeError('Source rule "%s" not yet executed' % (src))
        other_rule_ctx = self.build_context.rule_contexts[other_rule.path]
        src_items = other_rule_ctx.all_output_files
      else:
        # File or glob - treat as the same
        # This will only return files that exist
        glob_path = os.path.join(base_path, src)
        src_items = glob2.iglob(glob_path)

      # Apply the src_filter, if any
      src_filter = self.rule.src_filter
      for file_path in src_items:
        if src_filter and not fnmatch.fnmatch(file_path, src_filter):
          continue
        input_paths.add(file_path)
    return list(input_paths)

  def check_predecessor_failures(self):
    """Checks all dependencies for failure.

    Returns:
      True if any dependency has failed.
    """
    for dep in itertools.chain(self.rule.srcs, self.rule.deps):
      if util.is_rule_path(dep):
        other_rule = self.build_context.project.resolve_rule(
            dep, requesting_module=self.rule.parent_module)
        other_rule_ctx = self.build_context.rule_contexts.get(
            other_rule.path, None)
        if other_rule_ctx.status == Status.FAILED:
          return True
    return False

  def begin(self):
    """Begins asynchronous rule execution.
    Custom RuleContext implementations should override this method to perform
    their behavior (spawning tasks/etc). When the returned Deferred is called
    back the rule context should be completed, with all_output_files properly
    set.

    The default implementation ends immediately, passing all input files through
    as output.

    Returns:
      A Deferred that can will be called back when the rule has completed.
    """
    self.status = Status.RUNNING
    self.start_time = time.time()
    return self.deferred

  def cascade_failure(self):
    """Instantly fails a rule, signaling that a rule prior to it has failed
    and it should not be run.

    Use this if a call to check_predecessor_failures returns True to properly
    set a rule context up for cascading failures.
    After calling this begin should not be called.

    Returns:
      A Deferred that has had its errback called.
    """
    # TODO(benvanik): special CascadingError exception
    self.start_time = time.time()
    self._fail()
    return self.deferred

  def _succeed(self):
    """Signals that rule execution has completed successfully.
    This will set all state and issue the callback on the deferred.
    """
    self.status = Status.SUCCEEDED
    self.end_time = time.time()
    self.deferred.callback()

  def _fail(self, exception=None):
    """Signals that rule execution has completed in failure.
    This will set all state and issue the errback on the deferred.
    If an exception is provided it will be set on the context and passed as
    the first argument to the deferred.

    Args:
      exception: The exception that resulted in the rule failure, if any.
    """
    self.status = Status.FAILED
    self.end_time = time.time()
    self.exception = exception
    if exception:
      self.deferred.errback(exception)
    else:
      self.deferred.errback()


# class FileDelta(object):
#   """
#   TODO(benvanik): move to another module and setup to use cache
#   """

#   def __init__(self, source_paths=None):
#     """
#     Args:
#       source_paths
#     """
#     self.all_files = []
#     self.added_files = []
#     self.removed_files = []
#     self.changed_files = []
