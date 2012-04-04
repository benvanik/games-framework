#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the util module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2

import util
from util import Deferred


class IsRulePathTest(unittest2.TestCase):
  """Behavioral tests of the is_rule_path method."""

  def testEmpty(self):
    self.assertFalse(util.is_rule_path(None))
    self.assertFalse(util.is_rule_path(''))

  def testTypes(self):
    self.assertFalse(util.is_rule_path(4))
    self.assertFalse(util.is_rule_path(['a']))
    self.assertFalse(util.is_rule_path({'a': 1}))

  def testNames(self):
    self.assertTrue(util.is_rule_path(':a'))
    self.assertTrue(util.is_rule_path(':ab'))
    self.assertTrue(util.is_rule_path('xx:ab'))
    self.assertTrue(util.is_rule_path('/a/b:ab'))

    self.assertFalse(util.is_rule_path('a'))
    self.assertFalse(util.is_rule_path('/a/b.c'))
    self.assertFalse(util.is_rule_path('a b c'))


class ValidateNamesTest(unittest2.TestCase):
  """Behavioral tests of the validate_names method."""

  def testEmpty(self):
    util.validate_names(None)
    util.validate_names([])

  def testNames(self):
    util.validate_names(['a'])
    util.validate_names([':a'])
    util.validate_names(['xx:a'])
    util.validate_names(['/a/b:a'])
    util.validate_names(['/a/b.c:a'])
    util.validate_names(['/a/b.c/:a'])
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


class DeferredTest(unittest2.TestCase):
  """Behavioral tests of the Deferred type."""

  def testMultiCall(self):
    d = Deferred()
    d.callback()
    with self.assertRaises(AssertionError):
      d.callback()
    d = Deferred()
    d.errback()
    with self.assertRaises(AssertionError):
      d.errback()
    d = Deferred()
    d.callback()
    with self.assertRaises(AssertionError):
      d.errback()
    d = Deferred()
    d.errback()
    with self.assertRaises(AssertionError):
      d.callback()

  def testCallbackArgs(self):
    cb = {}
    def cb_thunk(*args, **kwargs):
      cb['done'] = True
      cb['args'] = args
      cb['kwargs'] = kwargs

    d = Deferred()
    self.assertFalse(d.is_done())
    d.callback()
    self.assertTrue(d.is_done())

    d = Deferred()
    self.assertFalse(d.is_done())
    d.errback()
    self.assertTrue(d.is_done())

    d = Deferred()
    d.add_callback_fn(cb_thunk)
    d.callback()
    self.assertNotEqual(len(cb), 0)
    self.assertTrue(cb['done'])
    self.assertEqual(len(cb['args']), 0)
    self.assertEqual(len(cb['kwargs']), 0)
    cb.clear()

    d = Deferred()
    d.add_callback_fn(cb_thunk)
    d.callback('a', 'b')
    self.assertNotEqual(len(cb), 0)
    self.assertTrue(cb['done'])
    self.assertEqual(len(cb['args']), 2)
    self.assertEqual(cb['args'][0], 'a')
    self.assertEqual(cb['args'][1], 'b')
    self.assertEqual(len(cb['kwargs']), 0)
    cb.clear()

    d = Deferred()
    d.add_callback_fn(cb_thunk)
    d.callback('a', b='b')
    self.assertNotEqual(len(cb), 0)
    self.assertTrue(cb['done'])
    self.assertEqual(len(cb['args']), 1)
    self.assertEqual(cb['args'][0], 'a')
    self.assertEqual(len(cb['kwargs']), 1)
    self.assertEqual(cb['kwargs']['b'], 'b')
    cb.clear()

  def testCallbackOrder(self):
    cb = {}
    def cb_thunk(*args, **kwargs):
      cb['done'] = True
      cb['args'] = args
      cb['kwargs'] = kwargs

    d = Deferred()
    d.add_callback_fn(cb_thunk)
    d.callback('a')
    self.assertNotEqual(len(cb), 0)
    self.assertTrue(cb['done'])
    self.assertEqual(len(cb['args']), 1)
    self.assertEqual(cb['args'][0], 'a')
    self.assertEqual(len(cb['kwargs']), 0)
    cb.clear()

    d = Deferred()
    d.callback('a')
    d.add_callback_fn(cb_thunk)
    self.assertNotEqual(len(cb), 0)
    self.assertTrue(cb['done'])
    self.assertEqual(len(cb['args']), 1)
    self.assertEqual(cb['args'][0], 'a')
    self.assertEqual(len(cb['kwargs']), 0)
    cb.clear()

    d = Deferred()
    d.add_errback_fn(cb_thunk)
    d.errback('a')
    self.assertNotEqual(len(cb), 0)
    self.assertTrue(cb['done'])
    self.assertEqual(len(cb['args']), 1)
    self.assertEqual(cb['args'][0], 'a')
    self.assertEqual(len(cb['kwargs']), 0)
    cb.clear()

    d = Deferred()
    d.errback('a')
    d.add_errback_fn(cb_thunk)
    self.assertNotEqual(len(cb), 0)
    self.assertTrue(cb['done'])
    self.assertEqual(len(cb['args']), 1)
    self.assertEqual(cb['args'][0], 'a')
    self.assertEqual(len(cb['kwargs']), 0)
    cb.clear()

    d = Deferred()
    d.add_callback_fn(cb_thunk)
    d.errback('a')
    self.assertEqual(len(cb), 0)
    cb.clear()

    d = Deferred()
    d.errback('a')
    d.add_callback_fn(cb_thunk)
    self.assertEqual(len(cb), 0)
    cb.clear()

    d = Deferred()
    d.add_errback_fn(cb_thunk)
    d.callback('a')
    self.assertEqual(len(cb), 0)
    cb.clear()

    d = Deferred()
    d.callback('a')
    d.add_errback_fn(cb_thunk)
    self.assertEqual(len(cb), 0)
    cb.clear()

  def testMultiCallbacks(self):
    cbs = []
    def cb_multi_thunk(*args, **kwargs):
      cbs.append({
          'done': True,
          'args': args,
          'kwargs': kwargs
          })

    d = Deferred()
    d.add_callback_fn(cb_multi_thunk)
    d.callback('a')
    self.assertEqual(len(cbs), 1)
    self.assertNotEqual(len(cbs[0]), 0)
    self.assertEqual(cbs[0]['args'][0], 'a')
    cbs[:] = []

    d = Deferred()
    d.add_callback_fn(cb_multi_thunk)
    d.add_callback_fn(cb_multi_thunk)
    d.callback('a')
    self.assertEqual(len(cbs), 2)
    self.assertNotEqual(len(cbs[0]), 0)
    self.assertNotEqual(len(cbs[1]), 0)
    self.assertEqual(cbs[0]['args'][0], 'a')
    self.assertEqual(cbs[1]['args'][0], 'a')
    cbs[:] = []

    d = Deferred()
    d.add_callback_fn(cb_multi_thunk)
    d.callback('a')
    d.add_callback_fn(cb_multi_thunk)
    self.assertEqual(len(cbs), 2)
    self.assertNotEqual(len(cbs[0]), 0)
    self.assertNotEqual(len(cbs[1]), 0)
    self.assertEqual(cbs[0]['args'][0], 'a')
    self.assertEqual(cbs[1]['args'][0], 'a')
    cbs[:] = []

    d = Deferred()
    d.callback('a')
    d.add_callback_fn(cb_multi_thunk)
    d.add_callback_fn(cb_multi_thunk)
    self.assertEqual(len(cbs), 2)
    self.assertNotEqual(len(cbs[0]), 0)
    self.assertNotEqual(len(cbs[1]), 0)
    self.assertEqual(cbs[0]['args'][0], 'a')
    self.assertEqual(cbs[1]['args'][0], 'a')
    cbs[:] = []


if __name__ == '__main__':
  unittest2.main()
