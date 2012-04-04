# Copyright 2012 Google Inc. All Rights Reserved.

"""Core rules for the build system.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from build.context import RuleContext
from build.rule import Rule, build_rule


@build_rule('rule')
class GenericRule(Rule):
  """A generic rule.
  Generic rules can take sources and dependencies and will pass any input
  sources on as outputs. They can be used as synthetic rules for making
  dependencies easier to manage, or for filtering many rules into one.
  """

  def __init__(self, name, *args, **kwargs):
    """Initializes a generic rule.

    Args:
      name: Rule name.
    """
    super(GenericRule, self).__init__(name, *args, **kwargs)

  def create_context(self, build_context):
    return RuleContext(build_context, self)
