#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the context module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import unittest2

import async
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


class BuildContextTest(FixtureTestCase):
  """Behavioral tests of the BuildContext type."""
  fixture = 'simple'

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
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))

    with BuildContext(self.build_env, project) as ctx:
      with self.assertRaises(NameError):
        ctx.execute(['x'])
      with self.assertRaises(KeyError):
        ctx.execute([':x'])
      with self.assertRaises(OSError):
        ctx.execute(['x:x'])

    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute([':a'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results(':a')
      self.assertEqual(results[0], Status.SUCCEEDED)

    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute([':mixed_input'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results(':mixed_input')
      self.assertEqual(results[0], Status.SUCCEEDED)
      self.assertEqual(len(results[1]), 2)

    class SucceedRule(Rule):
      class _Context(RuleContext):
        def begin(self):
          result = super(SucceedRule._Context, self).begin()
          print 'hello from rule %s' % (self.rule.path)
          self._succeed()
          return result
      def create_context(self, build_context):
        return SucceedRule._Context(build_context, self)
    class FailRule(Rule):
      class _Context(RuleContext):
        def begin(self):
          result = super(FailRule._Context, self).begin()
          print 'hello from rule %s' % (self.rule.path)
          self._fail()
          return result
      def create_context(self, build_context):
        return FailRule._Context(build_context, self)

    project = Project(modules=[Module('m', rules=[SucceedRule('a')])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute(['m:a'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.SUCCEEDED)

    project = Project(modules=[Module('m', rules=[
        SucceedRule('a'),
        SucceedRule('b', deps=[':a'])])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute(['m:b'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.SUCCEEDED)
      results = ctx.get_rule_results('m:b')
      self.assertEqual(results[0], Status.SUCCEEDED)

    project = Project(modules=[Module('m', rules=[FailRule('a')])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute(['m:a'])
      ctx.wait(d)
      self.assertErrback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.FAILED)

    project = Project(modules=[Module('m', rules=[
        FailRule('a'),
        SucceedRule('b', deps=[':a'])])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute(['m:b'])
      ctx.wait(d)
      self.assertErrback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.FAILED)
      results = ctx.get_rule_results('m:b')
      self.assertEqual(results[0], Status.FAILED)

    project = Project(modules=[Module('m', rules=[
        FailRule('a'),
        SucceedRule('b', deps=[':a'])])])
    with BuildContext(self.build_env, project, stop_on_error=True) as ctx:
      d = ctx.execute(['m:b'])
      ctx.wait(d)
      self.assertErrback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.FAILED)
      results = ctx.get_rule_results('m:b')
      self.assertEqual(results[0], Status.WAITING)

    # TODO(benvanik): test stop_on_error
    # TODO(benvanik): test raise_on_error

  def testCaching(self):
    # TODO(benvanik): test caching and force arg
    pass

  def testBuild(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))

    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute([':a'])
      ctx.wait(d)
      self.assertCallback(d)
      # TODO(benvanik): the rest of this


class RuleContextTest(FixtureTestCase):
  """Behavioral tests of the RuleContext type."""
  fixture = 'simple'

  def setUp(self):
    super(RuleContextTest, self).setUp()
    self.build_env = BuildEnvironment()

  def testStatus(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)
    project = Project(module_resolver=FileModuleResolver(root_path))
    rule = project.resolve_rule(':a')

    class SuccessfulRuleContext(RuleContext):
      def begin(self):
        result = super(SuccessfulRuleContext, self).begin()
        self._succeed()
        return result

    rule_ctx = SuccessfulRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    d = rule_ctx.begin()
    self.assertTrue(d.is_done())
    self.assertEqual(rule_ctx.status, Status.SUCCEEDED)

    class FailedRuleContext(RuleContext):
      def begin(self):
        result = super(FailedRuleContext, self).begin()
        self._fail()
        return result

    rule_ctx = FailedRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    d = rule_ctx.begin()
    self.assertTrue(d.is_done())
    self.assertEqual(rule_ctx.status, Status.FAILED)
    self.assertIsNone(rule_ctx.exception)

    class FailedWithErrorRuleContext(RuleContext):
      def begin(self):
        result = super(FailedWithErrorRuleContext, self).begin()
        self._fail(RuntimeError('Failure'))
        return result

    rule_ctx = FailedWithErrorRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    d = rule_ctx.begin()
    self.assertTrue(d.is_done())
    self.assertEqual(rule_ctx.status, Status.FAILED)
    self.assertIsInstance(rule_ctx.exception, RuntimeError)

  def testFileInputs(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    rule = project.resolve_rule(':file_input')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx.get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt']))

    rule = project.resolve_rule(':local_txt')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx.get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt', 'b.txt', 'c.txt']))

    rule = project.resolve_rule(':recursive_txt')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx.get_rule_outputs(rule)
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
    rule_outputs = build_ctx.get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt', 'b.txt', 'c.txt']))

    rule = project.resolve_rule(':recursive_txt_filter')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx.get_rule_outputs(rule)
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
    rule_outputs = build_ctx.get_rule_outputs(rule)
    self.assertNotEqual(len(rule_outputs), 0)

    rule = project.resolve_rule(':rule_input')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx.get_rule_outputs(rule)
    self.assertEqual(
        set([os.path.basename(f) for f in rule_outputs]),
        set(['a.txt']))

    rule = project.resolve_rule(':mixed_input')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx.get_rule_outputs(rule)
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
