#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the project module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2

from module import *
from project import *


class ProjectTest(unittest2.TestCase):
  """Behavioral tests of Project rule handling."""

  def testEmptyProject(self):
    project = Project()
    self.assertIsNone(project.get_module(':a'))
    self.assertEqual(len(project.module_list()), 0)
    self.assertEqual(len(list(project.module_iter())), 0)

  def testProjectName(self):
    project = Project()
    self.assertNotEqual(len(project.name), 0)
    project = Project(name='a')
    self.assertEqual(project.name, 'a')

  def testProjectModuleInit(self):
    module_a = Module('ma', rules=[Rule('a')])
    module_b = Module('mb', rules=[Rule('b')])
    module_list = [module_a, module_b]
    project = Project(modules=module_list)
    self.assertIsNot(project.module_list(), module_list)
    self.assertEqual(len(project.module_list()), len(module_list))
    self.assertIs(project.get_module('ma'), module_a)
    self.assertIs(project.get_module('mb'), module_b)

  def testAddModule(self):
    module_a = Module('ma', rules=[Rule('a')])
    module_b = Module('mb', rules=[Rule('b')])

    project = Project()
    self.assertIsNone(project.get_module('ma'))
    self.assertIsNone(project.get_module('mb'))
    self.assertEqual(len(project.module_list()), 0)

    project.add_module(module_a)
    self.assertIs(project.get_module('ma'), module_a)
    self.assertEqual(len(project.module_list()), 1)
    self.assertEqual(len(list(project.module_iter())), 1)
    self.assertEqual(project.module_list()[0], module_a)
    self.assertEqual(list(project.module_iter())[0], module_a)
    self.assertIsNone(project.get_module('mb'))

    project.add_module(module_b)
    self.assertIs(project.get_module('mb'), module_b)
    self.assertEqual(len(project.module_list()), 2)
    self.assertEqual(len(list(project.module_iter())), 2)

    with self.assertRaises(KeyError):
      project.add_module(module_b)
    self.assertEqual(len(project.module_list()), 2)

  def testAddModules(self):
    module_a = Module('ma', rules=[Rule('a')])
    module_b = Module('mb', rules=[Rule('b')])
    module_list = [module_a, module_b]

    project = Project()
    self.assertIsNone(project.get_module('ma'))
    self.assertIsNone(project.get_module('mb'))
    self.assertEqual(len(project.module_list()), 0)

    project.add_modules(module_list)
    self.assertIsNot(project.module_list(), module_list)
    self.assertEqual(len(project.module_list()), len(module_list))
    self.assertIs(project.get_module('ma'), module_a)
    self.assertIs(project.get_module('mb'), module_b)

    with self.assertRaises(KeyError):
      project.add_module(module_b)
    self.assertEqual(len(project.module_list()), len(module_list))
    with self.assertRaises(KeyError):
      project.add_modules([module_b])
    self.assertEqual(len(project.module_list()), len(module_list))
    with self.assertRaises(KeyError):
      project.add_modules(module_list)
    self.assertEqual(len(project.module_list()), len(module_list))

  def testGetModule(self):
    module_a = Module('ma', rules=[Rule('a')])
    module_b = Module('mb', rules=[Rule('b')])
    project = Project(modules=[module_a, module_b])

    self.assertIs(project.get_module('ma'), module_a)
    self.assertIs(project.get_module('mb'), module_b)
    self.assertIsNone(project.get_module('mx'))

  def testResolveRule(self):
    rule_a = Rule('a')
    rule_b = Rule('b')
    module_a = Module('ma', rules=[rule_a])
    module_b = Module('mb', rules=[rule_b])
    project = Project(modules=[module_a, module_b])

    with self.assertRaises(NameError):
      project.resolve_rule('a')
    with self.assertRaises(NameError):
      project.resolve_rule('a', requesting_module=module_a)

    self.assertIs(project.resolve_rule(':a', requesting_module=module_a),
                  rule_a)
    self.assertIs(project.resolve_rule(':b', requesting_module=module_b),
                  rule_b)
    self.assertIs(project.resolve_rule('ma:a', requesting_module=module_a),
                  rule_a)
    self.assertIs(project.resolve_rule('mb:b', requesting_module=module_b),
                  rule_b)
    self.assertIs(project.resolve_rule('mb:b', requesting_module=module_a),
                  rule_b)
    self.assertIs(project.resolve_rule('ma:a', requesting_module=module_b),
                  rule_a)

  def testModuleResolver(self):
    rule_a = Rule('a')
    rule_b = Rule('b')
    module_a = Module('ma', rules=[rule_a])
    module_b = Module('mb', rules=[rule_b])
    module_resolver = StaticModuleResolver([module_a, module_b])
    project = Project(module_resolver=module_resolver)

    self.assertEqual(len(project.module_list()), 0)
    self.assertIs(project.resolve_rule('ma:a'), rule_a)
    self.assertEqual(len(project.module_list()), 1)
    self.assertIs(project.resolve_rule('mb:b'), rule_b)
    self.assertEqual(len(project.module_list()), 2)

    with self.assertRaises(IOError):
      project.resolve_rule('mx:x')
