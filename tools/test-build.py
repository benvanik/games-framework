#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Python build system test runner.
In order to speed things up (and avoid some platform incompatibilities) this
script should be used instead of unit2 or python -m unittest.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2


def main():
  # Only find test_*.py files under build/
  loader = unittest2.TestLoader()
  tests = loader.discover('build',
                          pattern='*_test.py',
                          top_level_dir='.')

  # Run the tests in the default runner
  test_runner = unittest2.runner.TextTestRunner(verbosity=2)
  test_runner.run(tests)


if __name__ == '__main__':
  main()
