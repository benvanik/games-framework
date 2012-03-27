# Copyright 2012 Google Inc. All Rights Reserved.

"""Project representation.

A project is a module (or set of modules) that provides a namespace of rules.
Rules may refer to each other and will be resolved in the project namespace.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


class Project(object):
  """Project type that contains rules.
  Projects, once constructed, are designed to be immutable. Many duplicate
  build processes may run over the same project instance and all expect it to
  be in the state it was when first created.
  """

  def __init__(self):
    """Initializes an empty project.
    """
    self.rules = {}

  def AddRule(self, rule):
    """Adds a rule to the project.

    Args:
      rule: A rule to add. Must have a unique name.

    Raises:
      NameError: A rule with the given name already exists.
    """
    if self.rules.get(rule.name, None):
      raise NameError('A rule with the name "%s" is already defined' % (
          rule.name))
    self.rules[rule.name] = rule

  def GetRule(self, rule_name):
    """Gets a rule by name.

    Args:
      rule_name: Name of the rule to find.

    Returns:
      The rule with the given name or None if it was not found.
    """
    return self.rules.get(rule_name, None)

  def GetRules(self):
    """Gets a list of all rules in the project.

    Returns:
      A list of all rules.
    """
    return self.rules.values()

  def IterRules(self):
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
    if name.strip() != name:
      raise NameError('Name contains leading or trailing whitespace')
    if name[0] == ':':
      raise NameError('Name cannot start with :')
    self.name = name

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

    self._ValidateValues(self.srcs)
    self._ValidateValues(self.deps, require_semicolon=True)

  def _ValidateValues(self, values, require_semicolon=False):
    """Validates a list of srcs/deps values ot ensure they are well-defined.

    Args:
      values: A list of values to validate.
      require_semicolon: Whether to require a leading :

    Raises:
      NameError: A rule value is not valid.
    """
    for value in values:
      if not isinstance(value, str) or not len(value):
        raise TypeError('Value must by a string of non-zero length')
      if len(value.strip()) != len(value):
        raise NameError(
            'Values cannot have leading/trailing whitespace: "%s"' % (value))
      if require_semicolon and value[0] != ':':
        raise NameError('Values must be a rule (start with :): "%s"' % (value))
