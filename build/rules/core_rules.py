# Copyright 2012 Google Inc. All Rights Reserved.

"""Core rules for the build system.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from build.rule import Rule
import build.rules.util


#@build_rule('rule')
class GenericRule(Rule):
  def __init__(self, name, *args, **kwargs):
    super(GenericRule, self).__init__(name, *args, **kwargs)

  def __call__(self, name, *args, **kwargs):
    rule = GenericRule(name, *args, **kwargs)
    build.rules.util.emit_rule(rule)
build.rules.util.define_rule_type(GenericRule)


# def rule(name, *args, **kwargs):
#   """A generic rule.

#   Args:
#     name: Rule name.
#   """
#   rule = Rule(name, *args, **kwargs)
#   insert_rule(rule)
