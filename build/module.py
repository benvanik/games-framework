# Copyright 2012 Google Inc. All Rights Reserved.

"""Module/rule representation.

A module is a simple namespace of rules, serving no purpose other than to allow
for easier organization of projects.

Rules may refer to other rules in the same module with a shorthand (':foo') or
rules in other modules by specifying a module-relative path
('stuff/other.py:bar').

TODO(benvanik): details on path resolution
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import base64
import hashlib
import pickle
import re

import build
import util


class Module(object):
  """A rule module.
  Modules are a flat namespace of rules. The actual resolution of rules occurs
  later on and is done using all of the modules in a project, allowing for
  cycles/lazy evaluation/etc.
  """

  def __init__(self, path, rules=None):
    """Initializes a module.

    Args:
      path: A path for the module - should be the path on disk or some other
          string that is used for referencing.
      rules: A list of rules to add to the module.
    """
    self.path = path
    self.rules = {}
    if rules and len(rules):
      self.add_rules(rules)

  def add_rule(self, rule):
    """Adds a rule to the module.

    Args:
      rule: A rule to add. Must have a unique name.

    Raises:
      KeyError: A rule with the given name already exists in the module.
    """
    self.add_rules([rule])

  def add_rules(self, rules):
    """Adds a list of rules to the module.

    Args:
      rules: A list of rules to add. Each must have a unique name.

    Raises:
      KeyError: A rule with the given name already exists in the module.
    """
    for rule in rules:
      if self.rules.get(rule.name, None):
        raise KeyError('A rule with the name "%s" is already defined' % (
            rule.name))
    for rule in rules:
      self.rules[rule.name] = rule
      rule.set_parent_module(self)

  def get_rule(self, rule_name):
    """Gets a rule by name.

    Args:
      rule_name: Name of the rule to find. May include leading semicolon.

    Returns:
      The rule with the given name or None if it was not found.
    """
    if rule_name[0] == ':':
      rule_name = rule_name[1:]
    return self.rules.get(rule_name, None)

  def rule_list(self):
    """Gets a list of all rules in the module.

    Returns:
      A list of all rules.
    """
    return self.rules.values()

  def rule_iter(self):
    """Iterates over all rules in the module."""
    for rule_name in self.rules:
      yield self.rules[rule_name]


class Rule(object):
  """A rule definition.
  Rules are the base unit in a module and can depend on other rules via either
  source (which depends on the outputs of the rule) or explicit dependencies
  (which just requires that the other rule have been run before).

  Sources can also refer to files, folders, or file globs. When a rule goes to
  run a list of sources will be compiled from the outputs from the previous
  rules as well as all real files on the file system.
  """

  _whitespace_re = re.compile('\s', re.M)

  def __init__(self, name, srcs=None, deps=None, src_filter=None,
               *args, **kwargs):
    """Initializes a rule.

    Args:
      name: A name for the rule - should be literal-like and contain no leading
          or trailing whitespace.
      srcs: A list of source strings or a single source string.
      deps: A list of depdendency strings or a single dependency string.
      src_filter: An inclusionary file name filter for all non-rule paths. If
          defined only srcs that match this filter will be included.

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

    # Path will be updated when the parent module is set
    self.parent_module = None
    self.path = ':%s' % (name)

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

    self.src_filter = None
    if src_filter and len(src_filter):
      self.src_filter = src_filter

  def set_parent_module(self, module):
    """Sets the parent module of a rule.
    This can only be called once.

    Args:
      module: New parent module for the rule.

    Raises:
      ValueError: The parent module has already been set.
    """
    if self.parent_module:
      raise ValueError('Rule "%s" already has a parent module' % (self.name))
    self.parent_module = module
    self.path = '%s:%s' % (module.path, self.name)

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
    # Hash so that we return a reasonably-sized string
    return hashlib.md5(unique_str).hexdigest()


class ModuleLoader(object):
  """A utility type that handles loading modules from files.
  A loader should only be used to load a single module and then be discarded.
  """

  def __init__(self, path):
    """Initializes a loader.

    Args:
      path: File-system path to the module.
    """
    self.path = path
