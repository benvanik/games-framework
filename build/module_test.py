#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the module module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2

from module import *


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
      Rule('a b')
    with self.assertRaises(NameError):
      Rule(':a')
    rule = Rule('a')
    self.assertEqual(rule.name, 'a')
    self.assertEqual(rule.path, ':a')
    Rule('\u0CA_\u0CA')

  def testRuleSrcs(self):
    rule = Rule('r')
    self.assertEqual(len(rule.srcs), 0)

    srcs = ['a', 'b', ':c']
    rule = Rule('r', srcs=srcs)
    self.assertEqual(len(rule.srcs), 3)
    self.assertIsNot(rule.srcs, srcs)
    srcs[0] = 'x'
    self.assertEqual(rule.srcs[0], 'a')

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
    self.assertEqual(rule.deps[0], ':a')

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
    rule1_key = rule1.compute_cache_key()
    self.assertIsNotNone(rule1_key)
    self.assertGreater(len(rule1_key), 0)
    self.assertEqual(rule1_key, rule1.compute_cache_key())
    rule1.srcs.append('a')
    self.assertNotEqual(rule1_key, rule1.compute_cache_key())

    rule1 = Rule('r1')
    rule2 = Rule('r1')
    self.assertEqual(rule1.compute_cache_key(), rule2.compute_cache_key())
    rule1 = Rule('r1')
    rule2 = Rule('r2')
    self.assertNotEqual(rule1.compute_cache_key(), rule2.compute_cache_key())

    rule1 = Rule('r1', srcs='a')
    rule2 = Rule('r1', srcs='a')
    self.assertEqual(rule1.compute_cache_key(), rule2.compute_cache_key())
    rule1 = Rule('r1', srcs='a')
    rule2 = Rule('r1', srcs='b')
    self.assertNotEqual(rule1.compute_cache_key(), rule2.compute_cache_key())
    rule1 = Rule('r1', deps=':a')
    rule2 = Rule('r1', deps=':a')
    self.assertEqual(rule1.compute_cache_key(), rule2.compute_cache_key())
    rule1 = Rule('r1', deps=':a')
    rule2 = Rule('r1', deps=':b')
    self.assertNotEqual(rule1.compute_cache_key(), rule2.compute_cache_key())
    rule1 = Rule('r1', srcs='a', deps=':a')
    rule2 = Rule('r1', srcs='a', deps=':a')
    self.assertEqual(rule1.compute_cache_key(), rule2.compute_cache_key())
    rule1 = Rule('r1', srcs='a', deps=':a')
    rule2 = Rule('r1', srcs='b', deps=':b')
    self.assertNotEqual(rule1.compute_cache_key(), rule2.compute_cache_key())


class ModuleTest(unittest2.TestCase):
  """Behavioral tests of Module rule handling."""

  def testEmptyModule(self):
    module = Module('m')
    self.assertIsNone(module.get_rule(':a'))
    self.assertEqual(len(module.rule_list()), 0)
    self.assertEqual(len(list(module.rule_iter())), 0)

  def testModulePath(self):
    module = Module('a')
    self.assertEqual(module.path, 'a')

  def testModuleRuleInit(self):
    rule_a = Rule('a')
    rule_b = Rule('b')
    rule_list = [rule_a, rule_b]
    module = Module('m', rules=rule_list)
    self.assertIsNot(module.rule_list(), rule_list)
    self.assertEqual(len(module.rule_list()), len(rule_list))
    self.assertIs(module.get_rule(':a'), rule_a)
    self.assertIs(module.get_rule(':b'), rule_b)

  def testAddRule(self):
    rule_a = Rule('a')
    rule_b = Rule('b')

    module = Module('m')
    self.assertIsNone(module.get_rule(':a'))

    module.add_rule(rule_a)
    self.assertIs(module.get_rule('a'), rule_a)
    self.assertIs(module.get_rule(':a'), rule_a)
    self.assertEqual(len(module.rule_list()), 1)
    self.assertEqual(len(list(module.rule_iter())), 1)
    self.assertIs(module.rule_list()[0], rule_a)
    self.assertEqual(list(module.rule_iter())[0], rule_a)
    self.assertIsNone(module.get_rule(':b'))

    module.add_rule(rule_b)
    self.assertIs(module.get_rule(':b'), rule_b)
    self.assertEqual(len(module.rule_list()), 2)
    self.assertEqual(len(list(module.rule_iter())), 2)

    with self.assertRaises(KeyError):
      module.add_rule(rule_b)
    self.assertEqual(len(module.rule_list()), 2)

  def testAddRules(self):
    rule_a = Rule('a')
    rule_b = Rule('b')
    rule_list = [rule_a, rule_b]

    module = Module('m')
    self.assertIsNone(module.get_rule('a'))
    self.assertIsNone(module.get_rule(':a'))
    self.assertIsNone(module.get_rule('b'))
    self.assertIsNone(module.get_rule(':b'))
    self.assertEqual(len(module.rule_list()), 0)

    module.add_rules(rule_list)
    self.assertEqual(len(module.rule_list()), 2)
    self.assertEqual(len(list(module.rule_iter())), 2)
    self.assertIsNot(module.rule_list(), rule_list)
    self.assertIs(module.get_rule(':a'), rule_a)
    self.assertIs(module.get_rule(':b'), rule_b)

    with self.assertRaises(KeyError):
      module.add_rule(rule_b)
    self.assertEqual(len(module.rule_list()), 2)
    with self.assertRaises(KeyError):
      module.add_rules([rule_b])
    self.assertEqual(len(module.rule_list()), 2)
    with self.assertRaises(KeyError):
      module.add_rules(rule_list)
    self.assertEqual(len(module.rule_list()), 2)

  def testGetRule(self):
    rule = Rule('a')
    module = Module('m')
    module.add_rule(rule)

    self.assertIs(module.get_rule('a'), rule)
    self.assertIs(module.get_rule(':a'), rule)

    self.assertIsNone(module.get_rule(':x'))

  def testRuleParentModule(self):
    rule_a = Rule('a')
    module = Module('m')

    self.assertIsNone(rule_a.parent_module)
    self.assertEqual(rule_a.path, ':a')

    module.add_rule(rule_a)

    self.assertIs(rule_a.parent_module, module)
    self.assertEqual(rule_a.path, 'm:a')

    with self.assertRaises(ValueError):
      rule_a.set_parent_module(module)


if __name__ == '__main__':
  unittest2.main()
