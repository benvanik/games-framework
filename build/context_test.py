#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the context module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2

from context import *
from project import *


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

    project = Project(rules=[Rule('a')])
    ctx = BuildContext(self.build_env, project)

  def testExecution(self):
    project = Project(rules=[Rule('a')])

    ctx = BuildContext(self.build_env, project)
    with self.assertRaises(NameError):
      ctx.execute(['a'])
    with self.assertRaises(KeyError):
      ctx.execute([':b'])

    ctx = BuildContext(self.build_env, project)
    self.assertTrue(ctx.execute([':a']))

    # TODO(benvanik): test stop_on_error
    # TODO(benvanik): test raise_on_error

  def testCaching(self):
    # TODO(benvanik): test caching and force arg
    pass

  def testWorkerCount(self):
    # TODO(benvanik): test worker_count
    pass

  def testBuild(self):
    project = Project(rules=[
        Rule('a1'),
        Rule('a2'),
        Rule('b', deps=[':a1', ':a2'],),
        Rule('c', deps=[':b'],),])
    ctx = BuildContext(self.build_env, project)
    ctx.execute([':c'])
    # TODO(benvanik): the rest of this


class RuleContextTest(unittest2.TestCase):
  """Behavioral tests of the RuleContext type."""

  def setUp(self):
    super(RuleContextTest, self).setUp()
    self.build_env = BuildEnvironment()

  def test(self):
    pass
