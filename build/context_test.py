#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the context module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from context import *
from project import *
import unittest2


class BuildContextTest(unittest2.TestCase):
  """Behavioral tests of the BuildContext type."""

  def testConstruction(self):
    project = Project()
    ctx = BuildContext(project)
    self.assertIs(ctx.project, project)
    self.assertEqual(len(ctx.target_rules), 0)

    project = Project(rules=[Rule('a')])
    ctx = BuildContext(project, ':a')
    self.assertEqual(len(ctx.target_rules), 1)
    self.assertEqual(ctx.target_rules[0], ':a')
    ctx = BuildContext(project, [':a'])
    self.assertEqual(len(ctx.target_rules), 1)
    self.assertEqual(ctx.target_rules[0], ':a')
    with self.assertRaises(NameError):
      BuildContext(project, ['a'])
    with self.assertRaises(KeyError):
      BuildContext(project, [':b'])

  def testBuild(self):
    project = Project(rules=[
        Rule('a1'),
        Rule('a2'),
        Rule('b', deps=[':a1', ':a2'],),
        Rule('c', deps=[':b'],),])
    # TODO(benvanik): the rest of this
