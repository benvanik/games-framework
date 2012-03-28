# Copyright 2012 Google Inc. All Rights Reserved.

"""Project representation.

A project is a module (or set of modules) that provides a namespace of rules.
Rules may refer to each other and will be resolved in the project namespace.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import base64
import pickle
import re

import build
import util


class Project(object):
  """Project type that contains rules.
  Projects, once constructed, are designed to be immutable. Many duplicate
  build processes may run over the same project instance and all expect it to
  be in the state it was when first created.
  """

  def __init__(self, project_name='Project', rules=[]):
    """Initializes an empty project.

    Args:
      project_name: A human-readable name for the project that will be used for
          logging.

    Raises:
      NameError: The name given is not valid.
    """
    self.name = project_name
    self.rules = {}
    if len(rules):
      self.add_rules(rules)

  def add_rule(self, rule):
    """Adds a rule to the project.

    Args:
      rule: A rule to add. Must have a unique name.

    Raises:
      NameError: A rule with the given name already exists in the project.
    """
    self.add_rules([rule])

  def add_rules(self, rules):
    """Adds a list of rules to the project.

    Args:
      rules: A list of rules to add. Each must have a unique name.

    Raises:
      NameError: A rule with the given name already exists in the project.
    """
    for rule in rules:
      if self.rules.get(rule.name, None):
        raise NameError('A rule with the name "%s" is already defined' % (
            rule.name))
    for rule in rules:
      self.rules[rule.full_name] = rule

  def get_rule(self, rule_name):
    """Gets a rule by name.

    Args:
      rule_name: Name of the rule to find. Must include leading semicolon.

    Returns:
      The rule with the given name or None if it was not found.

    Raises:
      NameError: The given name did not contain a leading semicolon.
    """
    if not len(rule_name) or rule_name[0] != ':':
      raise NameError('The rule name "%s" is not valid' % (rule_name))
    return self.rules.get(rule_name, None)

  def rules_list(self):
    """Gets a list of all rules in the project.

    Returns:
      A list of all rules.
    """
    return self.rules.values()

  def rules_iter(self):
    """Iterates over all rules in the project.
    """
    for rule_name in self.rules:
      yield self.rules[rule_name]


class Rule(object):
  """A rule definition.
  Rules are the base unit in a project and can depend on other rules via either
  source (which depends on the outputs of the rule) or explicit dependencies
  (which just requires that the other rule have been run before).

  Sources can also refer to files, folders, or file globs. When a rule goes to
  run a list of sources will be compiled from the outputs from the previous
  rules as well as all real files on the file system.
  """

  _whitespace_re = re.compile('\s', re.M)

  def __init__(self, name, srcs=None, deps=None):
    """Initializes a rule.

    Args:
      name: A name for the rule - should be literal-like and contain no leading
          or trailing whitespace.
      srcs: A list of source strings or a single source string.
      deps: A list of depdendency strings or a single dependency string.

    Raises:
      NameError: The given name is invalid (None/0-length).
      TypeError: The type of an argument or value is invalid.
    """
    if not name or not len(name):
      raise NameError('Invalid name')
    if self._whitespace_re.search(name):
      raise NameError('Name contains leading or trailing whitespace')
    if name[0] == ':':
      raise NameError('Name cannot start with :')
    self.name = name
    self.full_name = ':%s' % (name)

    # Note that all srcs/deps are copied in
    self.srcs = []
    if isinstance(srcs, str):
      if len(srcs):
        self.srcs.append(srcs)
    elif isinstance(srcs, list):
      self.srcs.extend(srcs)
    elif srcs != None:
      raise TypeError('Invalid srcs type')

    self.deps = []
    if isinstance(deps, str):
      if len(deps):
        self.deps.append(deps)
    elif isinstance(deps, list):
      self.deps.extend(deps)
    elif deps != None:
      raise TypeError('Invalid deps type')

    util.validate_names(self.srcs)
    util.validate_names(self.deps, require_semicolon=True)

  def compute_cache_key(self):
    """Calculates a unique key based on the rule type and its values.
    This key may change when code changes, but is a fairly reliable way to
    detect changes in rule values.

    Returns:
      A string that can be used to index this key in a dictionary. The string
      may be very long.
    """
    # TODO(benvanik): faster serialization than pickle?
    pickled_self = pickle.dumps(self)
    pickled_str = base64.b64encode(pickled_self)
    # Include framework version in the string to enable forced rebuilds on
    # version change
    unique_str = build.VERSION_STR + pickled_str
    # TODO(benvanik): hash instead of return full string?
    return unique_str
