#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the context module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import unittest2

from context import *
from module import *
from rule import *
from project import *
from test import FixtureTestCase


class BuildEnvironmentTest(unittest2.TestCase):
  """Behavioral tests of the BuildEnvironment type."""

  def testConstruction(self):
    build_env = BuildEnvironment()


class BuildContextTest(unittest2.TestCase):
  """Behavioral tests of the BuildContext type."""

  def setUp(self):
    super(BuildContextTest, self).setUp()
    self.build_env = BuildEnvironment()

  def testConstruction(self):
    project = Project()
    ctx = BuildContext(self.build_env, project)
    with self.assertRaises(ValueError):
      BuildContext(self.build_env, project, worker_count=0)

    project = Project(modules=[Module('m', rules=[Rule('a')])])
    ctx = BuildContext(self.build_env, project)

  def testExecution(self):
    project = Project(modules=[Module('m', rules=[Rule('a')])])

    ctx = BuildContext(self.build_env, project)
    with self.assertRaises(NameError):
      ctx.execute(['a'])
    with self.assertRaises(KeyError):
      ctx.execute([':b'])
    with self.assertRaises(KeyError):
      ctx.execute(['m:b'])

    ctx = BuildContext(self.build_env, project)
    self.assertTrue(ctx.execute(['m:a']))

    # TODO(benvanik): test stop_on_error
    # TODO(benvanik): test raise_on_error

  def testCaching(self):
    # TODO(benvanik): test caching and force arg
    pass

  def testWorkerCount(self):
    # TODO(benvanik): test worker_count
    pass

  def testBuild(self):
    project = Project(modules=[Module('m', rules=[
        Rule('a1'),
        Rule('a2'),
        Rule('b', deps=[':a1', ':a2']),
        Rule('c', deps=[':b'])])])
    ctx = BuildContext(self.build_env, project)
    ctx.execute(['m:c'])
    # TODO(benvanik): the rest of this


class RuleContextTest(FixtureTestCase):
  """Behavioral tests of the RuleContext type."""
  fixture = 'simple'

  def setUp(self):
    super(RuleContextTest, self).setUp()
    self.build_env = BuildEnvironment()

  def testFileInputs(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    rule = project.resolve_rule(':file_input')
    rule_ctx = rule.create_context(build_ctx)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_ctx.all_input_files]),
        set(['a.txt']))

    rule = project.resolve_rule(':local_txt')
    rule_ctx = rule.create_context(build_ctx)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_ctx.all_input_files]),
        set(['a.txt', 'b.txt', 'c.txt']))

    rule = project.resolve_rule(':recursive_txt')
    rule_ctx = rule.create_context(build_ctx)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_ctx.all_input_files]),
        set(['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt']))

  def testFileInputFilters(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    rule = project.resolve_rule(':local_txt_filter')
    rule_ctx = rule.create_context(build_ctx)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_ctx.all_input_files]),
        set(['a.txt', 'b.txt', 'c.txt']))

    rule = project.resolve_rule(':recursive_txt_filter')
    rule_ctx = rule.create_context(build_ctx)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_ctx.all_input_files]),
        set(['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt']))

  def testRuleInputs(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    # TODO(benvanik): test rules
    rule = project.resolve_rule(':rule_input')
    # rule_ctx = rule.create_context(build_ctx)
    # self.assertEqual(
    #     set([os.path.basename(f) for f in rule_ctx.all_input_files]),
    #     set(['a.txt', 'b.txt', 'c.txt']))

    # TODO(benvanik): test mixed (rule|file) inputs


if __name__ == '__main__':
  unittest2.main()
