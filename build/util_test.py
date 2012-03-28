#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the util module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2
import util


class ValidateNamesTest(unittest2.TestCase):
  """Behavioral tests of the ValidateNames method."""

  def testEmpty(self):
    util.ValidateNames(None)
    util.ValidateNames([])

  def testNames(self):
    util.ValidateNames(['a'])
    util.ValidateNames([':a'])
    util.ValidateNames(['a', ':b'])
    with self.assertRaises(TypeError):
      util.ValidateNames([None])
    with self.assertRaises(TypeError):
      util.ValidateNames([''])
    with self.assertRaises(TypeError):
      util.ValidateNames([{}])
    with self.assertRaises(NameError):
      util.ValidateNames([' a'])
    with self.assertRaises(NameError):
      util.ValidateNames(['a '])
    with self.assertRaises(NameError):
      util.ValidateNames([' a '])
    with self.assertRaises(NameError):
      util.ValidateNames(['a', ' b'])

  def testRequireSemicolon(self):
    util.ValidateNames([':a'], require_semicolon=True)
    util.ValidateNames([':a', ':b'], require_semicolon=True)
    with self.assertRaises(NameError):
      util.ValidateNames(['a'], require_semicolon=True)
    with self.assertRaises(NameError):
      util.ValidateNames([':a', 'b'], require_semicolon=True)


class UnderscoreToPascalCase(unittest2.TestCase):
  """Behavioral tests of the UnderscoreToPascalCase method."""

  def testEmpty(self):
    self.assertEqual(
        util.UnderscoreToPascalCase(None),
        None)
    self.assertEqual(
        util.UnderscoreToPascalCase(''),
        '')

  def testUnderscores(self):
    self.assertEqual(
        util.UnderscoreToPascalCase('ab'),
        'Ab')
    self.assertEqual(
        util.UnderscoreToPascalCase('aB'),
        'Ab')
    self.assertEqual(
        util.UnderscoreToPascalCase('AB'),
        'Ab')
    self.assertEqual(
        util.UnderscoreToPascalCase('a_b'),
        'AB')
    self.assertEqual(
        util.UnderscoreToPascalCase('A_b'),
        'AB')
    self.assertEqual(
        util.UnderscoreToPascalCase('aa_bb'),
        'AaBb')
    self.assertEqual(
        util.UnderscoreToPascalCase('aa1_bb2'),
        'Aa1Bb2')
    self.assertEqual(
        util.UnderscoreToPascalCase('1aa_2bb'),
        '1aa2bb')

  def testWhitespace(self):
    self.assertEqual(
        util.UnderscoreToPascalCase(' '),
        ' ')
    self.assertEqual(
        util.UnderscoreToPascalCase(' a'),
        ' a')
    self.assertEqual(
        util.UnderscoreToPascalCase('a '),
        'A ')
    self.assertEqual(
        util.UnderscoreToPascalCase(' a '),
        ' a ')
    self.assertEqual(
        util.UnderscoreToPascalCase('a b'),
        'A b')
    self.assertEqual(
        util.UnderscoreToPascalCase('a  b'),
        'A  b')


if __name__ == '__main__':
  unittest2.main()
