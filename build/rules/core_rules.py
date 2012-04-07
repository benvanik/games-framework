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

  Inputs:
    srcs: Source file paths.

  Outputs:
    All of the source file paths, passed-through unmodified.
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
      self._append_output_paths(self.src_paths)
      self._succeed()

  def create_context(self, build_context):
    return FileSetRule._Context(build_context, self)


@build_rule('copy_files')
class CopyFilesRule(Rule):
  """Copy files from one path to another.
  Copies all source files to the output path.

  The resulting structure will match that of all files relative to the path of
  the module the rule is in. For example, srcs='a.txt' will result in
  '$out/a.txt', and srcs='dir/a.txt' will result in '$out/dir/a.txt'.

  If a src_filter is provided then it is used to filter all sources.

  Inputs:
    srcs: Source file paths.
    out: Optional path, relative to the output path, to base file paths.
        For example, srcs='dir/a.txt' with out='place/' would result in an
        output file of '$out/place/dir/a.txt'.

  Outputs:
    All of the copied files in the output path.
  """

  def __init__(self, name, *args, **kwargs):
    """Initializes a copy files rule.

    Args:
      name: Rule name.
    """
    super(CopyFilesRule, self).__init__(name, *args, **kwargs)

  class _Context(RuleContext):
    def begin(self):
      super(CopyFilesRule._Context, self).begin()
      self._append_output_paths(self.src_paths)
      self._succeed()

  def create_context(self, build_context):
    return CopyFilesRule._Context(build_context, self)


@build_rule('concat_files')
class ConcatFilesRule(Rule):
  """Concatenate many files into one.
  Takes all source files and concatenates them together. The order is based on
  the ordering of the srcs list, and all files are treated as binary.

  Note that if referencing other rules or globs the order of files may be
  undefined, so if order matters try to enumerate files manually.

  TODO(benvanik): support a text mode?

  Inputs:
    srcs: Source file paths. The order is the order in which they will be
        concatenated.

  Outputs:
    All of the srcs concatenated into a single file path. If no out is specified
    a file with the name of the rule will be created.
  """

  def __init__(self, name, *args, **kwargs):
    """Initializes a concatenate files rule.

    Args:
      name: Rule name.
    """
    super(ConcatFilesRule, self).__init__(name, *args, **kwargs)

  class _Context(RuleContext):
    def begin(self):
      super(ConcatFilesRule._Context, self).begin()
      self._append_output_paths(self.src_paths)
      self._succeed()

  def create_context(self, build_context):
    return ConcatFilesRule._Context(build_context, self)


@build_rule('template_files')
class TemplateFilesRule(Rule):
  """Applies simple templating to a set of files.
  Processes each source file replacing a list of strings with corresponding
  strings.

  TODO(benvanik): more advanced template vars? perhaps regex?

  Inputs:
    srcs: Source file paths.
    params: A dictionary of key-value replacement parameters.

  Outputs:
    One file for each source file with the templating rules applied.
  """

  def __init__(self, name, params=None, *args, **kwargs):
    """Initializes a file templating rule.

    Args:
      name: Rule name.
      params: A dictionary of key-value replacement parameters.
    """
    super(TemplateFilesRule, self).__init__(name, *args, **kwargs)
    self.params = params

  class _Context(RuleContext):
    def begin(self):
      super(TemplateFilesRule._Context, self).begin()
      self._append_output_paths(self.src_paths)
      self._succeed()

  def create_context(self, build_context):
    return TemplateFilesRule._Context(build_context, self)
