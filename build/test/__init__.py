# Copyright 2012 Google Inc. All Rights Reserved.

"""Base test case for tests that require static file fixtures.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import tempfile
import shutil
import sys
import unittest2


class AsyncTestCase(unittest2.TestCase):
  """Test case adding additional asserts for async results."""

  def assertCallback(self, deferred):
    self.assertTrue(deferred.is_done())
    done = []
    def _callback(*args, **kwargs):
      done.append(True)
    def _errback(*args, **kwargs):
      self.fail('Deferred failed when it should have succeeded')
    deferred.add_errback_fn(_errback)
    deferred.add_callback_fn(_callback)
    if not len(done):
      self.fail('Deferred not called back with success')

  def assertCallbackEqual(self, deferred, value):
    self.assertTrue(deferred.is_done())
    done = []
    def _callback(*args, **kwargs):
      if isinstance(value, list):
        self.assertEqual(args, value)
      else:
        self.assertEqual(args[0], value)
      done.append(True)
    def _errback(*args, **kwargs):
      self.fail('Deferred failed when it should have succeeded')
    deferred.add_errback_fn(_errback)
    deferred.add_callback_fn(_callback)
    if not len(done):
      self.fail('Deferred not called back with success')

  def assertErrback(self, deferred):
    self.assertTrue(deferred.is_done())
    done = []
    def _callback(*args, **kwargs):
      self.fail('Deferred succeeded when it should have failed')
    def _errback(*args, **kwargs):
      done.append(True)
    deferred.add_callback_fn(_callback)
    deferred.add_errback_fn(_errback)
    if not len(done):
      self.fail('Deferred not called back with error')

  def assertErrbackWithError(self, deferred, error_cls):
    self.assertTrue(deferred.is_done())
    done = []
    def _callback(*args, **kwargs):
      self.fail('Deferred succeeded when it should have failed')
    def _errback(*args, **kwargs):
      done.append(True)
      if not len(args):
        self.fail('Deferred failed with no error')
      self.assertIsInstance(args[0], error_cls)
    deferred.add_callback_fn(_callback)
    deferred.add_errback_fn(_errback)
    if not len(done):
      self.fail('Deferred not called back with error')


class FixtureTestCase(unittest2.TestCase):
  """Test case supporting static fixture/output support.
  Set self.fixture to a folder name from the test/fixtures/ path.
  """

  def _find_build_path(self):
    """Scans up the current path for the build/ folder.

    Returns:
      The 'build/' folder.
    """
    path = sys.path[0]
    while True:
      if os.path.exists(os.path.join(path, 'build')):
        return os.path.join(path, 'build')
      path = os.path.dirname(path)
      if not len(path):
        return None

  def setUp(self):
    super(FixtureTestCase, self).setUp()

    # Root output path
    self.temp_path = tempfile.mkdtemp()
    self.addCleanup(shutil.rmtree, self.temp_path)

    # Copy fixture files
    if self.fixture:
      build_path = self._find_build_path()
      if not build_path:
        raise Error('Unable to find build path')
      fixture_path = os.path.join(build_path, 'test', 'fixtures', self.fixture)
      target_path = self.temp_path + '/' + self.fixture
      shutil.copytree(fixture_path, target_path)
