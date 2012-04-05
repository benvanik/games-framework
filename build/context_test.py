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
from task import *
from test import AsyncTestCase, FixtureTestCase


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
    with BuildContext(self.build_env, project): pass

    project = Project(modules=[Module('m', rules=[Rule('a')])])
    with BuildContext(self.build_env, project) as ctx:
      self.assertIsNotNone(ctx.task_executor)

    with BuildContext(self.build_env, project,
                      task_executor=InProcessTaskExecutor()) as ctx:
      self.assertIsNotNone(ctx.task_executor)

  def testExecution(self):
    project = Project(modules=[Module('m', rules=[Rule('a')])])

    with BuildContext(self.build_env, project) as ctx:
      with self.assertRaises(NameError):
        ctx.execute(['a'])
      with self.assertRaises(KeyError):
        ctx.execute([':b'])
      with self.assertRaises(KeyError):
        ctx.execute(['m:b'])

    with BuildContext(self.build_env, project) as ctx:
      result = ctx.execute(['m:a'])

    # TODO(benvanik): test stop_on_error
    # TODO(benvanik): test raise_on_error

  def testCaching(self):
    # TODO(benvanik): test caching and force arg
    pass

  def testBuild(self):
    project = Project(modules=[Module('m', rules=[
        Rule('a1'),
        Rule('a2'),
        Rule('b', deps=[':a1', ':a2']),
        Rule('c', deps=[':b'])])])
    with BuildContext(self.build_env, project) as ctx:
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
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt']))

    rule = project.resolve_rule(':local_txt')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt', 'b.txt', 'c.txt']))

    rule = project.resolve_rule(':recursive_txt')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt']))

  def testFileInputFilters(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    rule = project.resolve_rule(':local_txt_filter')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt', 'b.txt', 'c.txt']))

    rule = project.resolve_rule(':recursive_txt_filter')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt']))

  def testRuleInputs(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    rule = project.resolve_rule(':file_input')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertNotEqual(len(rule_outputs), 0)

    rule = project.resolve_rule(':rule_input')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt']))

    rule = project.resolve_rule(':mixed_input')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx._get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt', 'b.txt']))

    rule = project.resolve_rule(':missing_input')
    with self.assertRaises(KeyError):
      build_ctx._execute_rule(rule)

    build_ctx = BuildContext(self.build_env, project)
    rule = project.resolve_rule(':rule_input')
    with self.assertRaises(RuntimeError):
      build_ctx._execute_rule(rule)


if __name__ == '__main__':
  unittest2.main()
