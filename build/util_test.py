#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the util module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2

import util


class IsRuleNameTest(unittest2.TestCase):
  """Behavioral tests of the is_rule_name method."""

  def testEmpty(self):
    self.assertFalse(util.is_rule_name(None))
    self.assertFalse(util.is_rule_name(''))

  def testTypes(self):
    self.assertFalse(util.is_rule_name(4))
    self.assertFalse(util.is_rule_name(['a']))
    self.assertFalse(util.is_rule_name({'a': 1}))

  def testNames(self):
    self.assertTrue(util.is_rule_name(':a'))
    self.assertTrue(util.is_rule_name(':ab'))

    self.assertFalse(util.is_rule_name('a'))
    self.assertFalse(util.is_rule_name('/a/b.c'))
    self.assertFalse(util.is_rule_name('a b c'))


class ValidateNamesTest(unittest2.TestCase):
  """Behavioral tests of the validate_names method."""

  def testEmpty(self):
    util.validate_names(None)
    util.validate_names([])

  def testNames(self):
    util.validate_names(['a'])
    util.validate_names([':a'])
    util.validate_names(['a', ':b'])
    with self.assertRaises(TypeError):
      util.validate_names([None])
    with self.assertRaises(TypeError):
      util.validate_names([''])
    with self.assertRaises(TypeError):
      util.validate_names([{}])
    with self.assertRaises(NameError):
      util.validate_names([' a'])
    with self.assertRaises(NameError):
      util.validate_names(['a '])
    with self.assertRaises(NameError):
      util.validate_names([' a '])
    with self.assertRaises(NameError):
      util.validate_names(['a', ' b'])

  def testRequireSemicolon(self):
    util.validate_names([':a'], require_semicolon=True)
    util.validate_names([':a', ':b'], require_semicolon=True)
    with self.assertRaises(NameError):
      util.validate_names(['a'], require_semicolon=True)
    with self.assertRaises(NameError):
      util.validate_names([':a', 'b'], require_semicolon=True)


class UnderscoreToPascalCaseTest(unittest2.TestCase):
  """Behavioral tests of the underscore_to_pascalcase method."""

  def testEmpty(self):
    self.assertEqual(
        util.underscore_to_pascalcase(None),
        None)
    self.assertEqual(
        util.underscore_to_pascalcase(''),
        '')

  def testUnderscores(self):
    self.assertEqual(
        util.underscore_to_pascalcase('ab'),
        'Ab')
    self.assertEqual(
        util.underscore_to_pascalcase('aB'),
        'Ab')
    self.assertEqual(
        util.underscore_to_pascalcase('AB'),
        'Ab')
    self.assertEqual(
        util.underscore_to_pascalcase('a_b'),
        'AB')
    self.assertEqual(
        util.underscore_to_pascalcase('A_b'),
        'AB')
    self.assertEqual(
        util.underscore_to_pascalcase('aa_bb'),
        'AaBb')
    self.assertEqual(
        util.underscore_to_pascalcase('aa1_bb2'),
        'Aa1Bb2')
    self.assertEqual(
        util.underscore_to_pascalcase('1aa_2bb'),
        '1aa2bb')

  def testWhitespace(self):
    self.assertEqual(
        util.underscore_to_pascalcase(' '),
        ' ')
    self.assertEqual(
        util.underscore_to_pascalcase(' a'),
        ' a')
    self.assertEqual(
        util.underscore_to_pascalcase('a '),
        'A ')
    self.assertEqual(
        util.underscore_to_pascalcase(' a '),
        ' a ')
    self.assertEqual(
        util.underscore_to_pascalcase('a b'),
        'A b')
    self.assertEqual(
        util.underscore_to_pascalcase('a  b'),
        'A  b')


if __name__ == '__main__':
  unittest2.main()
