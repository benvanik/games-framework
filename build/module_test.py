#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the module module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import unittest2

from module import *
from rule import *
from test import FixtureTestCase


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


class ModuleLoaderTest(FixtureTestCase):
  fixture = 'simple'

  def testLoad(self):
    module_path = os.path.join(self.temp_path, 'simple', 'BUILD')
    loader = ModuleLoader(module_path)
    loader.load()

    loader = ModuleLoader(module_path + '.not-real')
    with self.assertRaises(IOError):
      loader.load()

    loader = ModuleLoader(module_path)
    loader.load(source_string='x = 5')
    with self.assertRaises(Exception):
      loader.load(source_string='y = 5')

    loader = ModuleLoader(module_path)
    with self.assertRaises(SyntaxError):
      loader.load(source_string='x/')
    with self.assertRaises(Exception):
      loader.load(source_string='y = 5')

  def testExecute(self):
    module_path = os.path.join(self.temp_path, 'simple', 'BUILD')

    loader = ModuleLoader(module_path)
    loader.load(source_string='asdf()')
    with self.assertRaises(NameError):
      loader.execute()

    loader = ModuleLoader(module_path)
    loader.load(source_string='')
    module = loader.execute()
    self.assertEqual(len(module.rule_list()), 0)

    loader = ModuleLoader(module_path)
    loader.load(source_string='x = 5')
    module = loader.execute()
    self.assertEqual(len(module.rule_list()), 0)

    loader = ModuleLoader(module_path)
    loader.load(source_string='rule("a")\nrule("b")')
    module = loader.execute()
    self.assertEqual(len(module.rule_list()), 2)
    self.assertIsNotNone(module.get_rule(':a'))
    self.assertIsNotNone(module.get_rule(':b'))
    self.assertEqual(module.get_rule(':a').name, 'a')
    self.assertEqual(module.get_rule(':b').name, 'b')

  def testCustomRules(self):
    module_path = os.path.join(self.temp_path, 'simple', 'BUILD')

    class MockRule1(Rule):
      pass
    rule_namespace = RuleNamespace()
    rule_namespace.add_rule_type('mock_rule_1', MockRule1)
    loader = ModuleLoader(module_path, rule_namespace=rule_namespace)
    loader.load(source_string='mock_rule_1("a")')
    module = loader.execute()
    self.assertEqual(len(module.rule_list()), 1)
    self.assertIsNotNone(module.get_rule(':a'))
    self.assertEqual(module.get_rule(':a').name, 'a')

if __name__ == '__main__':
  unittest2.main()
