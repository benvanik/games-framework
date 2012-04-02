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

  def __init__(self, name='Project', module_resolver=None, modules=None):
    """Initializes an empty project.

    Args:
      name: A human-readable name for the project that will be used for
          logging.
      module_resolver: A module resolver to use when attempt to dynamically
          resolve modules by path.
      modules: A list of modules to add to the project.

    Raises:
      NameError: The name given is not valid.
    """
    self.name = name
    self.module_resolver = module_resolver
    if not self.module_resolver:
      self.module_resolver = ModuleResolver()
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
      if self.modules.get(module.path, None):
        raise KeyError('A module with the path "%s" is already defined' % (
            module.path))
    for module in modules:
      self.modules[module.path] = module

  def get_module(self, module_path):
    """Gets a module by path.

    Args:
      module_path: Name of the module to find.

    Returns:
      The module with the given path or None if it was not found.
    """
    return self.modules.get(module_path, None)

  def module_list(self):
    """Gets a list of all modules in the project.

    Returns:
      A list of all modules.
    """
    return self.modules.values()

  def module_iter(self):
    """Iterates over all modules in the project."""
    for module_path in self.modules:
      yield self.modules[module_path]

  def resolve_rule(self, rule_path, requesting_module=None):
    """Gets a rule by path, supporting module lookup and dynamic loading.

    Args:
      rule_path: Path of the rule to find. Must include a semicolon.
      requesting_module: The module that is requesting the given rule. If not
          provided then no local rule paths (':foo') or relative paths are
          allowed.

    Returns:
      The rule with the given name or None if it was not found.

    Raises:
      NameError: The given rule name was not valid.
      KeyError: The given rule was not found.
    """
    if string.find(rule_path, ':') == -1:
      raise NameError('The rule path "%s" is missing a semicolon' % (rule_path))
    (module_path, rule_name) = string.rsplit(rule_path, ':', 1)
    if not len(module_path) and not requesting_module:
      raise KeyError('Local rule "%s" given when no resolver defined' % (
          rule_path))

    module = requesting_module
    if len(module_path):
      module = self.modules.get(module_path, None)
      if not module:
        # Module not yet loaded - need to grab it
        abs_module_path = module_path
        if requesting_module:
          # TODO(benvanik): expand path/etc?
          pass
        module = self.module_resolver.load_module(abs_module_path)
        if module:
          self.add_module(module)
        else:
          raise IOError('Module "%s" not found', module_path)

    return module.get_rule(rule_name)


class ModuleResolver(object):
  """A type to use for resolving modules.
  This is used to get a module when a project tries to resolve a rule in a
  module that has not yet been loaded.
  """

  def load_module(self, path):
    """Loads a module from the given path.

    Args:
      path: Absolute path of the module.

    Returns:
      A Module representing the given path or None if it could not be found.

    Raises:
      IOError: The module could not be found.
      NameError: The given path was not valid.
    """
    raise NotImplementedError()


class StaticModuleResolver(ModuleResolver):
  """A static module resolver that can resolve from a list of modules.
  """

  def __init__(self, modules):
    """Initializes a static module resolver.

    Args:
      modules: A list of modules that can be resolved.
    """
    self.modules = {}
    for module in modules:
      self.modules[module.path] = module

  def load_module(self, path):
    return self.modules.get(path, None)
