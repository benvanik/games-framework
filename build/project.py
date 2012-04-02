# Copyright 2012 Google Inc. All Rights Reserved.

"""Project representation.

A project is a module (or set of modules) that provides a namespace of rules.
Rules may refer to each other and will be resolved in the project namespace.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import base64
import pickle
import re
import string

import build
import util


class Project(object):
  """Project type that contains rules.
  Projects, once constructed, are designed to be immutable. Many duplicate
  build processes may run over the same project instance and all expect it to
  be in the state it was when first created.
  """

  def __init__(self, name='Project', modules=None):
    """Initializes an empty project.

    Args:
      name: A human-readable name for the project that will be used for
          logging.
      modules: A list of modules to add to the project.

    Raises:
      NameError: The name given is not valid.
    """
    self.name = name
    self.modules = {}
    if modules and len(modules):
      self.add_modules(modules)

  def add_module(self, module):
    """Adds a module to the project.

    Args:
      module: A module to add.

    Raises:
      KeyError: A module with the given name already exists in the project.
    """
    self.add_modules([module])

  def add_modules(self, modules):
    """Adds a list of modules to the project.

    Args:
      modules: A list of modules to add.

    Raises:
      KeyError: A module with the given name already exists in the project.
    """
    for module in modules:
      if self.modules.get(module.name, None):
        raise KeyError('A module with the name "%s" is already defined' % (
            module.name))
    for module in modules:
      self.modules[module.name] = module

  def get_module(self, module_name):
    """Gets a module by name.

    Args:
      module_name: Name of the module to find.

    Returns:
      The module with the given name or None if it was not found.
    """
    return self.modules.get(module_name, None)

  def module_list(self):
    """Gets a list of all modules in the project.

    Returns:
      A list of all modules.
    """
    return self.modules.values()

  def module_iter(self):
    """Iterates over all modules in the project."""
    for module_name in self.modules:
      yield self.modules[module_name]

  def resolve_rule(self, requesting_module, rule_path):
    """Gets a rule by path, supporting module lookup and dynamic loading.

    Args:
      requesting_module: The module that is requesting the given rule.
      rule_path: Path of the rule to find. Must include a semicolon.

    Returns:
      The rule with the given name or None if it was not found.

    Raises:
      NameError: The given rule name was not valid.
    """
    if string.find(rule_path, ':') == -1:
      raise NameError('The rule path "%s" is missing a semicolon' % (rule_path))
    (module_name, rule_name) = string.rsplit(rule_path, ':', 1)
    if not len(rule_name):
      raise NameError('No rule name given in "%s"' % (rule_path))

    module = requesting_module
    if len(module_name):
      module = self.modules.get(module_name, None)
      if not module:
        # Module not yet loaded - need to grab it
        raise NotImplementedError()

    return module.get_rule(rule_name)


