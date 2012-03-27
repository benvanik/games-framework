#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'


from .. import util
import unittest2


class UnderscoreToPascalCase(unittest2.TestCase):
  """
  Behavioral tests of the UnderscoreToPascalCase method.
  """

  def test_empty(self):
    self.assertEqual(
        util.UnderscoreToPascalCase(None),
        None)
    self.assertEqual(
        util.UnderscoreToPascalCase(''),
        '')

  def test_underscores(self):
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

  def test_whitespace(self):
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
