# Copyright 2012 Google Inc. All Rights Reserved.

"""Module representation.

A module is a simple namespace of rules, serving no purpose other than to allow
for easier organization of projects.

Rules may refer to other rules in the same module with a shorthand (':foo') or
rules in other modules by specifying a module-relative path
('stuff/other.py:bar').

TODO(benvanik): details on path resolution
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import ast
import io

import rule


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


class ModuleLoader(object):
  """A utility type that handles loading modules from files.
  A loader should only be used to load a single module and then be discarded.
  """

  def __init__(self, path, rule_modules=None):
    """Initializes a loader.

    Args:
      path: File-system path to the module.
      rule_modules: A list of rule modules to recursively search for rules.
    """
    self.path = path

    self.code_str = None
    self.code_ast = None
    self.code_obj = None

    self.rule_fns = self._load_all_rule_fns(rule_modules)

  def _load_all_rule_fns(self, rule_modules=None):
    """

    Args:
      rule_modules: A list of rule modules to recursively search for rules.

    Returns:
      A dictionary of rule functions.
    """
    rule_fns = {}
    if not rule_modules:
      rule_modules = []
    for rule_module in rule_modules:
      self._load_rule_fns(rule_fns, rule_module)
    return rule_fns

  def _load_rule_fns(self, scope, py_module):
    """Loads all rule functions from the build.rules module into the scope.

    Args:
      scope: A scope dictionary that will be passed to the module on load.
    """
    # Import all rules from referenced modules
    ref_modules = getattr(py_module, '__all__', [])
    for ref_module in ref_modules:
      self._load_rule_fns(scope, ref_module)

    # Add rules
    build_rules = getattr(py_module, 'BUILD_RULES', [])
    for rule_fn in build_rules:
      rule_name = rule_fn.func_name
      if scope.has_key(rule_name):
        raise KeyError('Rule "%s" already defined' % (rule_name))
      scope[rule_name] = rule_fn

  def load(self, source_string=None):
    """Loads the module from the given path and prepares it for execution.

    Args:
      source_string: A string to use as the source. If not provided the file
          will be loaded at the initialized path.

    Raises:
      IOError: The file could not be loaded or read.
      SyntaxError: An error occurred parsing the module.
    """
    if self.code_str:
      raise Exception('ModuleLoader load called multiple times')

    # Read the source as a string
    if source_string is None:
      with io.open(self.path, 'r') as f:
        self.code_str = f.read()
    else:
      self.code_str = source_string

    # Parse the AST
    # This will raise errors if it is not valid
    self.code_ast = ast.parse(self.code_str, self.path, 'exec')

    # Compile
    self.code_obj = compile(self.code_ast, self.path, 'exec')

  def execute(self):
    """Executes the module and returns a Module instance.

    Returns:
      A new Module instance with all of the rules.

    Raises:
      NameError: A function or variable name was not found.
    """
    load_scope = _ModuleLoadScope()
    rule.LOAD_SCOPE = load_scope

    try:
      # Setup scope
      scope = {}
      for rule_fn_name in self.rule_fns:
        scope[rule_fn_name] = self.rule_fns[rule_fn_name]

      # Execute!
      exec self.code_obj in scope
    finally:
      rule.LOAD_SCOPE = None

    # Gather rules and build the module
    module = Module(self.path)
    module.add_rules(load_scope.rules)
    return module


class _ModuleLoadScope(object):
  """Module loading scope.
  Used during module loading to manage shared variables (such as the current
  rule list/etc).
  An instance of this type is specified on the rules module.
  """

  def __init__(self):
    """Initializes a load scope.
    """
    self.rules = []

  def add_rule(self, rule):
    """Adds a rule to the load scope.

    Args:
      rule: Rule to add.
    """
    # TODO(benvanik): check for duplicate (local) rules here?
    self.rules.append(rule)
