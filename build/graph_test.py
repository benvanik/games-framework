#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the graph module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from graph import *
from project import *
import unittest2


class RuleGraphTest(unittest2.TestCase):
  """Behavioral tests of the RuleGraph type."""

  def setUp(self):
    super(RuleGraphTest, self).setUp()

    self.project = Project(rules=[
        Rule('a1'),
        Rule('a2'),
        Rule('a3'),
        Rule('b', deps=[':a1', ':a2'],),
        Rule('c', deps=[':b'],),])

  def testConstruction(self):
    project = Project()
    graph = RuleGraph(project)
    self.assertIs(graph.project, project)

    project = self.project
    graph = RuleGraph(project)
    self.assertIs(graph.project, project)

  def testHasDependency(self):
    graph = RuleGraph(Project())
    with self.assertRaises(KeyError):
      graph.has_dependency(':a', ':b')

    graph = RuleGraph(self.project)
    self.assertTrue(graph.has_dependency(':c', ':c'))
    self.assertTrue(graph.has_dependency(':a3', ':a3'))
    self.assertTrue(graph.has_dependency(':c', ':b'))
    self.assertTrue(graph.has_dependency(':c', ':a1'))
    self.assertTrue(graph.has_dependency(':b', ':a1'))
    self.assertFalse(graph.has_dependency(':b', ':c'))
    self.assertFalse(graph.has_dependency(':a1', ':a2'))
    self.assertFalse(graph.has_dependency(':c', ':a3'))
    with self.assertRaises(KeyError):
      graph.has_dependency(':c', ':x')
    with self.assertRaises(KeyError):
      graph.has_dependency(':x', ':c')
    with self.assertRaises(KeyError):
      graph.has_dependency(':x', ':x')

  def testCalculateRuleSequence(self):
    graph = RuleGraph(self.project)

    with self.assertRaises(KeyError):
      graph.calculate_rule_sequence([':x'])

    seq = graph.calculate_rule_sequence([':a1'])
    self.assertEqual(len(seq), 1)
    self.assertEqual(seq[0].full_name, ':a1')

    seq = graph.calculate_rule_sequence([':b'])
    self.assertEqual(len(seq), 3)
    self.assertTrue((seq[0].full_name == ':a1' and
                     seq[1].full_name == ':a2') or
                    (seq[0].full_name == ':a2' and
                     seq[1].full_name == ':a1'))
    self.assertEqual(seq[2].full_name, ':b')

    seq = graph.calculate_rule_sequence([':a1', ':b'])
    self.assertEqual(len(seq), 3)
    self.assertTrue((seq[0].full_name == ':a1' and
                     seq[1].full_name == ':a2') or
                    (seq[0].full_name == ':a2' and
                     seq[1].full_name == ':a1'))
    self.assertEqual(seq[2].full_name, ':b')

    seq = graph.calculate_rule_sequence([':a1', ':a3'])
    self.assertEqual(len(seq), 2)
    self.assertTrue((seq[0].full_name == ':a1' and
                     seq[1].full_name == ':a3') or
                    (seq[0].full_name == ':a3' and
                     seq[1].full_name == ':a1'))
