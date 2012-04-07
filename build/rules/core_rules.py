# Copyright 2012 Google Inc. All Rights Reserved.

"""Core rules for the build system.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from build.context import RuleContext
from build.rule import Rule, build_rule


@build_rule('file_set')
class FileSetRule(Rule):
  """A file set aggregation rule.
  All source files are globbed together and de-duplicated before being passed
  on as outputs. If a src_filter is provided then it is used to filter all
  sources.

  File set rules can be used as synthetic rules for making dependencies easier
  to manage, or for filtering many rules into one.
  """

  def __init__(self, name, *args, **kwargs):
    """Initializes a file set rule.

    Args:
      name: Rule name.
    """
    super(FileSetRule, self).__init__(name, *args, **kwargs)

  class _Context(RuleContext):
    def begin(self):
      super(FileSetRule._Context, self).begin()
      self.all_output_files.extend(self.all_input_files)
      self._succeed()

  def create_context(self, build_context):
    return FileSetRule._Context(build_context, self)


