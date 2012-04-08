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


class BuildEnvironmentTest(FixtureTestCase):
  """Behavioral tests of the BuildEnvironment type."""
  fixture='simple'

  def testConstruction(self):
    build_env = BuildEnvironment()
    self.assertTrue(os.path.isdir(build_env.root_path))

    build_env = BuildEnvironment(root_path='.')
    self.assertTrue(os.path.isdir(build_env.root_path))

    root_path = os.path.join(self.temp_path, 'simple')
    build_env = BuildEnvironment(root_path=root_path)
    self.assertTrue(os.path.isdir(build_env.root_path))
    self.assertEqual(build_env.root_path, root_path)

    root_path = os.path.join(self.temp_path, 'simple')
    build_env = BuildEnvironment(root_path=os.path.join(root_path, 'dir'))
    self.assertTrue(os.path.isdir(build_env.root_path))
    self.assertEqual(build_env.root_path, os.path.join(root_path, 'dir'))

    with self.assertRaises(OSError):
      BuildEnvironment(root_path='/not/found')

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
        ctx.execute_async(['x'])
      with self.assertRaises(KeyError):
        ctx.execute_async([':x'])
      with self.assertRaises(OSError):
        ctx.execute_async(['x:x'])

    with BuildContext(self.build_env, project) as ctx:
      self.assertTrue(ctx.execute_sync([':a']))
      results = ctx.get_rule_results(':a')
      self.assertEqual(results[0], Status.SUCCEEDED)

    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute_async([':a'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results(':a')
      self.assertEqual(results[0], Status.SUCCEEDED)

    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute_async([':mixed_input'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results(':mixed_input')
      self.assertEqual(results[0], Status.SUCCEEDED)
      self.assertEqual(len(results[1]), 2)

    class SucceedRule(Rule):
      class _Context(RuleContext):
        def begin(self):
          super(SucceedRule._Context, self).begin()
          #print 'hello from rule %s' % (self.rule.path)
          self._succeed()
      def create_context(self, build_context):
        return SucceedRule._Context(build_context, self)
    class FailRule(Rule):
      class _Context(RuleContext):
        def begin(self):
          super(FailRule._Context, self).begin()
          #print 'hello from rule %s' % (self.rule.path)
          self._fail()
      def create_context(self, build_context):
        return FailRule._Context(build_context, self)

    project = Project(modules=[Module('m', rules=[SucceedRule('a')])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute_async(['m:a'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.SUCCEEDED)

    project = Project(modules=[Module('m', rules=[
        SucceedRule('a'),
        SucceedRule('b', deps=[':a'])])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute_async(['m:b'])
      ctx.wait(d)
      self.assertCallback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.SUCCEEDED)
      results = ctx.get_rule_results('m:b')
      self.assertEqual(results[0], Status.SUCCEEDED)

    project = Project(modules=[Module('m', rules=[FailRule('a')])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute_async(['m:a'])
      ctx.wait(d)
      self.assertErrback(d)
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.FAILED)

    project = Project(modules=[Module('m', rules=[FailRule('a')])])
    with BuildContext(self.build_env, project) as ctx:
      self.assertFalse(ctx.execute_sync(['m:a']))
      results = ctx.get_rule_results('m:a')
      self.assertEqual(results[0], Status.FAILED)

    project = Project(modules=[Module('m', rules=[
        FailRule('a'),
        SucceedRule('b', deps=[':a'])])])
    with BuildContext(self.build_env, project) as ctx:
      d = ctx.execute_async(['m:b'])
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
      d = ctx.execute_async(['m:b'])
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
      d = ctx.execute_async([':a'])
      ctx.wait(d)
      self.assertCallback(d)
      # TODO(benvanik): the rest of this


class RuleContextTest(FixtureTestCase):
  """Behavioral tests of the RuleContext type."""
  fixture = 'simple'

  def setUp(self):
    super(RuleContextTest, self).setUp()
    root_path = os.path.join(self.temp_path, 'simple')
    self.build_env = BuildEnvironment(root_path=root_path)

  def testStatus(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)
    project = Project(module_resolver=FileModuleResolver(root_path))
    rule = project.resolve_rule(':a')

    class SuccessfulRuleContext(RuleContext):
      def begin(self):
        super(SuccessfulRuleContext, self).begin()
        self._succeed()

    rule_ctx = SuccessfulRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    rule_ctx.begin()
    self.assertTrue(rule_ctx.deferred.is_done())
    self.assertEqual(rule_ctx.status, Status.SUCCEEDED)

    class FailedRuleContext(RuleContext):
      def begin(self):
        super(FailedRuleContext, self).begin()
        self._fail()

    rule_ctx = FailedRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    rule_ctx.begin()
    self.assertTrue(rule_ctx.deferred.is_done())
    self.assertEqual(rule_ctx.status, Status.FAILED)
    self.assertIsNone(rule_ctx.exception)

    class FailedWithErrorRuleContext(RuleContext):
      def begin(self):
        super(FailedWithErrorRuleContext, self).begin()
        self._fail(RuntimeError('Failure'))

    rule_ctx = FailedWithErrorRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    rule_ctx.begin()
    self.assertTrue(rule_ctx.deferred.is_done())
    self.assertEqual(rule_ctx.status, Status.FAILED)
    self.assertIsInstance(rule_ctx.exception, RuntimeError)

    class SuccessfulAsyncRuleContext(RuleContext):
      def begin(self):
        super(SuccessfulAsyncRuleContext, self).begin()
        d = Deferred()
        self._chain(d)
        d.callback()

    rule_ctx = SuccessfulAsyncRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    rule_ctx.begin()
    self.assertTrue(rule_ctx.deferred.is_done())
    self.assertEqual(rule_ctx.status, Status.SUCCEEDED)

    class FailedAsyncRuleContext(RuleContext):
      def begin(self):
        super(FailedAsyncRuleContext, self).begin()
        d = Deferred()
        self._chain(d)
        d.errback(RuntimeError('Failure'))

    rule_ctx = FailedAsyncRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    rule_ctx.begin()
    self.assertTrue(rule_ctx.deferred.is_done())
    self.assertEqual(rule_ctx.status, Status.FAILED)
    self.assertIsInstance(rule_ctx.exception, RuntimeError)

    class FailedManyAsyncRuleContext(RuleContext):
      def begin(self):
        super(FailedManyAsyncRuleContext, self).begin()
        d1 = Deferred()
        d2 = Deferred()
        self._chain([d1, d2])
        d1.callback()
        d2.errback(RuntimeError('Failure'))

    rule_ctx = FailedManyAsyncRuleContext(build_ctx, rule)
    self.assertEqual(rule_ctx.status, Status.WAITING)
    rule_ctx.begin()
    self.assertTrue(rule_ctx.deferred.is_done())
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

    rule = project.resolve_rule(':missing_txt')
    with self.assertRaises(OSError):
      build_ctx._execute_rule(rule)

    rule = project.resolve_rule(':missing_glob_txt')
    d = build_ctx._execute_rule(rule)
    self.assertTrue(d.is_done())
    rule_outputs = build_ctx.get_rule_outputs(rule)
    self.assertEqual(len(rule_outputs), 0)

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

  def testTargetPaths(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    def _compare_path(result, expected):
      result = os.path.relpath(result, root_path)
      self.assertEqual(result, expected)

    class SuccessfulRuleContext(RuleContext):
      def begin(self):
        super(SuccessfulRuleContext, self).begin()
        self._succeed()

    rule = project.resolve_rule(':a')
    rule_ctx = SuccessfulRuleContext(build_ctx, rule)
    _compare_path(rule_ctx._get_out_path(), 'build-out/a')
    _compare_path(rule_ctx._get_out_path(suffix='.txt'), 'build-out/a.txt')
    _compare_path(rule_ctx._get_out_path('f'), 'build-out/f')
    _compare_path(rule_ctx._get_out_path('f', suffix='.txt'), 'build-out/f.txt')
    _compare_path(rule_ctx._get_out_path('dir/f'), 'build-out/dir/f')
    # Note that both are implemented the same way
    _compare_path(rule_ctx._get_gen_path(), 'build-gen/a')
    _compare_path(rule_ctx._get_gen_path(suffix='.txt'), 'build-gen/a.txt')
    _compare_path(rule_ctx._get_gen_path('f'), 'build-gen/f')
    _compare_path(rule_ctx._get_gen_path('f', suffix='.txt'), 'build-gen/f.txt')
    _compare_path(rule_ctx._get_gen_path('dir/f'), 'build-gen/dir/f')

    rule = project.resolve_rule('dir/dir_2:d')
    rule_ctx = SuccessfulRuleContext(build_ctx, rule)
    _compare_path(rule_ctx._get_out_path(), 'build-out/dir/dir_2/d')
    _compare_path(rule_ctx._get_out_path(suffix='.txt'),
                  'build-out/dir/dir_2/d.txt')
    _compare_path(rule_ctx._get_out_path('f'),
                  'build-out/dir/dir_2/f')
    _compare_path(rule_ctx._get_out_path('f', suffix='.txt'),
                  'build-out/dir/dir_2/f.txt')
    _compare_path(rule_ctx._get_out_path('dir/f'),
                  'build-out/dir/dir_2/dir/f')

  def testTargetSrcPaths(self):
    root_path = os.path.join(self.temp_path, 'simple')
    project = Project(module_resolver=FileModuleResolver(root_path))
    build_ctx = BuildContext(self.build_env, project)

    def _compare_path(result, expected):
      result = os.path.relpath(result, root_path)
      self.assertEqual(result, expected)

    class SuccessfulRuleContext(RuleContext):
      def begin(self):
        super(SuccessfulRuleContext, self).begin()
        self._succeed()

    rule = project.resolve_rule(':a')
    rule_ctx = SuccessfulRuleContext(build_ctx, rule)
    _compare_path(
        rule_ctx._get_out_path_for_src(os.path.join(root_path, 'a.txt')),
        'build-out/a.txt')
    _compare_path(
        rule_ctx._get_out_path_for_src(os.path.join(root_path, 'dir/a.txt')),
        'build-out/dir/a.txt')
    # Note that both are implemented the same way
    _compare_path(
        rule_ctx._get_gen_path_for_src(os.path.join(root_path, 'a.txt')),
        'build-gen/a.txt')
    _compare_path(
        rule_ctx._get_gen_path_for_src(os.path.join(root_path, 'dir/a.txt')),
        'build-gen/dir/a.txt')

if __name__ == '__main__':
  unittest2.main()
