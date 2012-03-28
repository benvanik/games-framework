# Copyright 2012 Google Inc. All Rights Reserved.

"""Build context.

A build context is created to manage the dependency graph and build rules, as
well as handling distribution and execution of the tasks those rules create.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import build
import graph
import project
import util


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

  def __init__(self, project, target_rules=None):
    """Initializes a build context.

    Args:
      project: Project to use for building.
      target_rules: A list of rule names (or a single rule name) that are to be
          built.

    Raises:
      KeyError: One of the given target rules was not found in the project.
      NameError: An invalid target rule was given.
      TypeError: An invalid target rule was given.
    """
    self.project = project
    if not project:
      raise TypeError('Project required')

    # Note that the rule list is copied
    self.target_rules = []
    if isinstance(target_rules, str):
      if len(target_rules):
        self.target_rules.append(target_rules)
    elif isinstance(target_rules, list):
      self.target_rules.extend(target_rules)
    elif target_rules != None:
      raise TypeError('Invalid target_rules type')

    # Verify that target rules are valid and exist
    util.validate_names(self.target_rules, require_semicolon=True)
    for rule_name in self.target_rules:
      if not self.project.get_rule(rule_name):
        raise KeyError('Target rule "%s" not found in project' % (rule_name))

    # Build the rule graph
    self.rule_graph = graph.RuleGraph(self.project)
