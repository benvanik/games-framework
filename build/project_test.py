#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the project module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


from project import *
import unittest2


class RuleTest(unittest2.TestCase):
  """Behavioral tests of the Rule type."""

  def testRuleNames(self):
    with self.assertRaises(NameError):
      Rule(None)
    with self.assertRaises(NameError):
      Rule('')
    with self.assertRaises(NameError):
      Rule(' ')
    with self.assertRaises(NameError):
      Rule(' a')
    with self.assertRaises(NameError):
      Rule('a ')
    with self.assertRaises(NameError):
      Rule(' a ')
    with self.assertRaises(NameError):
      Rule('a\n')
    with self.assertRaises(NameError):
      Rule('a\t')
    with self.assertRaises(NameError):
      Rule(':a')
    Rule('a')
    Rule('a b')
    Rule('\u0CA_\u0CA')

  def testRuleSrcs(self):
    rule = Rule('r')
    self.assertEqual(len(rule.srcs), 0)

    srcs = ['a', 'b', ':c']
    rule = Rule('r', srcs=srcs)
    self.assertEqual(len(rule.srcs), 3)
    self.assertIsNot(rule.srcs, srcs)
    srcs[0] = 'x'
    self.assertEquals(rule.srcs[0], 'a')

    srcs = 'a'
    rule = Rule('r', srcs=srcs)
    self.assertEqual(len(rule.srcs), 1)
    self.assertEqual(rule.srcs[0], 'a')

    rule = Rule('r', srcs=None)
    rule = Rule('r', srcs='')
    self.assertEqual(len(rule.srcs), 0)
    with self.assertRaises(TypeError):
      Rule('r', srcs={})
    with self.assertRaises(TypeError):
      Rule('r', srcs=[None])
    with self.assertRaises(TypeError):
      Rule('r', srcs=[''])
    with self.assertRaises(TypeError):
      Rule('r', srcs=[{}])
    with self.assertRaises(NameError):
      Rule('r', srcs=' a')
    with self.assertRaises(NameError):
      Rule('r', srcs='a ')
    with self.assertRaises(NameError):
      Rule('r', srcs=' a ')

  def testRuleDeps(self):
    rule = Rule('r')
    self.assertEqual(len(rule.deps), 0)

    deps = [':a', ':b', ':c']
    rule = Rule('r', deps=deps)
    self.assertEqual(len(rule.deps), 3)
    self.assertIsNot(rule.deps, deps)
    deps[0] = 'x'
    self.assertEquals(rule.deps[0], ':a')

    deps = ':a'
    rule = Rule('r', deps=deps)
    self.assertEqual(len(rule.deps), 1)
    self.assertEqual(rule.deps[0], ':a')

    rule = Rule('r', deps=None)
    rule = Rule('r', deps='')
    self.assertEqual(len(rule.deps), 0)
    with self.assertRaises(TypeError):
      Rule('r', deps={})
    with self.assertRaises(TypeError):
      Rule('r', deps=[None])
    with self.assertRaises(TypeError):
      Rule('r', deps=[''])
    with self.assertRaises(TypeError):
      Rule('r', deps={})
    with self.assertRaises(NameError):
      Rule('r', deps=' a')
    with self.assertRaises(NameError):
      Rule('r', deps='a ')
    with self.assertRaises(NameError):
      Rule('r', deps=' a ')

  def testRuleCacheKey(self):
    rule1 = Rule('r1')
    rule1_key = rule1.ComputeCacheKey()
    self.assertIsNotNone(rule1_key)
    self.assertGreater(len(rule1_key), 0)
    self.assertEqual(rule1_key, rule1.ComputeCacheKey())
    rule1.srcs.append('a')
    self.assertNotEqual(rule1_key, rule1.ComputeCacheKey())

    rule1 = Rule('r1')
    rule2 = Rule('r1')
    self.assertEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())
    rule1 = Rule('r1')
    rule2 = Rule('r2')
    self.assertNotEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())

    rule1 = Rule('r1', srcs='a')
    rule2 = Rule('r1', srcs='a')
    self.assertEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())
    rule1 = Rule('r1', srcs='a')
    rule2 = Rule('r1', srcs='b')
    self.assertNotEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())
    rule1 = Rule('r1', deps=':a')
    rule2 = Rule('r1', deps=':a')
    self.assertEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())
    rule1 = Rule('r1', deps=':a')
    rule2 = Rule('r1', deps=':b')
    self.assertNotEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())
    rule1 = Rule('r1', srcs='a', deps=':a')
    rule2 = Rule('r1', srcs='a', deps=':a')
    self.assertEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())
    rule1 = Rule('r1', srcs='a', deps=':a')
    rule2 = Rule('r1', srcs='b', deps=':b')
    self.assertNotEqual(rule1.ComputeCacheKey(), rule2.ComputeCacheKey())


class ProjectTest(unittest2.TestCase):
  """Behavioral tests of Project rule handling."""

  def testEmptyProject(self):
    project = Project()
    self.assertIsNone(project.GetRule('a'))
    self.assertEqual(len(project.GetRules()), 0)
    self.assertEqual(len(list(project.IterRules())), 0)

  def testAddRule(self):
    project = Project()
    rule_a = Rule('a')
    rule_b = Rule('b')
    self.assertIsNone(project.GetRule('a'))
    project.AddRule(rule_a)
    self.assertEqual(project.GetRule('a'), rule_a)
    self.assertEqual(len(project.GetRules()), 1)
    self.assertEqual(len(list(project.IterRules())), 1)
    self.assertEqual(project.GetRules()[0], rule_a)
    self.assertEqual(list(project.IterRules())[0], rule_a)
    self.assertIsNone(project.GetRule('b'))
    project.AddRule(rule_b)
    self.assertEqual(project.GetRule('b'), rule_b)
    self.assertEqual(len(project.GetRules()), 2)
    self.assertEqual(len(list(project.IterRules())), 2)
