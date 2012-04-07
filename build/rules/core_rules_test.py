#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the core_rules module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import unittest2

from build.context import BuildContext, BuildEnvironment, Status
from build.project import FileModuleResolver, Project
from build.test import FixtureTestCase
from core_rules import *


class RuleTestCase(FixtureTestCase):
  def assertRuleResultsEqual(self, build_ctx, rule_path, expected_file_matches,
      output_prefix=''):
    results = build_ctx.get_rule_results(rule_path)
    self.assertEqual(results[0], Status.SUCCEEDED)
    output_paths = results[1]
    self.assertEqual(len(output_paths), len(expected_file_matches))

    rule = build_ctx.project.resolve_rule(rule_path)
    output_base = os.path.join(os.path.dirname(rule.parent_module.path),
                               output_prefix)
    #print output_base
    #print output_paths
    #print expected_file_matches
    self.assertEqual(
        set([os.path.relpath(f, output_base) for f in output_paths]),
        set(expected_file_matches))


class FileSetRuleTest(RuleTestCase):
  """Behavioral tests of the FileSetRule type."""
  fixture='core_rules/file_set'

  def setUp(self):
    super(FileSetRuleTest, self).setUp()
    self.build_env = BuildEnvironment()

  def test(self):
    root_path = os.path.join(self.temp_path, 'core_rules/file_set')
    project = Project(module_resolver=FileModuleResolver(root_path))

    with BuildContext(self.build_env, project) as ctx:
      self.assertTrue(ctx.execute_sync([
          ':a',
          ':a_glob',
          ':b_ref',
          ':all_glob',
          ':combo',
          ':dupes',
          'dir:b',
          'dir:b_glob',
          ]))

      self.assertRuleResultsEqual(ctx,
          ':a', ['a.txt',])
      self.assertRuleResultsEqual(ctx,
          ':a_glob', ['a.txt',])
      self.assertRuleResultsEqual(ctx,
          ':b_ref', ['dir/b.txt',])
      self.assertRuleResultsEqual(ctx,
          ':all_glob', ['a.txt', 'dir/b.txt',])
      self.assertRuleResultsEqual(ctx,
          ':combo', ['a.txt', 'dir/b.txt',])
      self.assertRuleResultsEqual(ctx,
          ':dupes', ['a.txt', 'dir/b.txt',])
      self.assertRuleResultsEqual(ctx,
          'dir:b', ['b.txt',])
      self.assertRuleResultsEqual(ctx,
          'dir:b_glob', ['b.txt',])


class CopyFilesRuleTest(RuleTestCase):
  """Behavioral tests of the CopyFilesRule type."""
  fixture='core_rules'

  def test(self):
    rule = CopyFilesRule('a')
    pass


class ConcatFilesRuleTest(RuleTestCase):
  """Behavioral tests of the ConcatFilesRule type."""
  fixture='core_rules'

  def test(self):
    rule = ConcatFilesRule('a')
    pass


class TemplateFilesRuleTest(RuleTestCase):
  """Behavioral tests of the TemplateFilesRule type."""
  fixture='core_rules'

  def test(self):
    rule = TemplateFilesRule('a')
    pass


if __name__ == '__main__':
  unittest2.main()
