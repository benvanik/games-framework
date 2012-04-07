#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the core_rules module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import unittest2

from core_rules import *
from build.test import FixtureTestCase


class FileSetRuleTest(FixtureTestCase):
  """Behavioral tests of the FileSetRule type."""
  fixture='core_rules'

  def test(self):
    rule = FileSetRule('a')
    pass


class CopyFilesRuleTest(FixtureTestCase):
  """Behavioral tests of the CopyFilesRule type."""
  fixture='core_rules'

  def test(self):
    rule = CopyFilesRule('a')
    pass


class ConcatFilesRuleTest(FixtureTestCase):
  """Behavioral tests of the ConcatFilesRule type."""
  fixture='core_rules'

  def test(self):
    rule = ConcatFilesRule('a')
    pass


class TemplateFilesRuleTest(FixtureTestCase):
  """Behavioral tests of the TemplateFilesRule type."""
  fixture='core_rules'

  def test(self):
    rule = TemplateFilesRule('a')
    pass


if __name__ == '__main__':
  unittest2.main()
