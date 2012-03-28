# Copyright 2012 Google Inc. All Rights Reserved.

"""Base test case for tests that require static file fixtures.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import tempfile
import shutil
import sys
import unittest2


class FixtureTestCase(unittest2.TestCase):
  """Test case supporting static fixture/output support.
  """

  def __init__(self, fixture=None):
    """Initalize fixture test case.

    Args:
      fixture: An optional fixture name to setup from the test/fixtures/ path.
    """
    super(FixtureTestCase, self).__init()
    self.fixture = fixture

  def _find_build_path(self):
    """Scans up the current path for the build/ folder.

    Returns:
      The 'build/' folder.
    """
    path = sys.path[0]
    while True:
      if os.path.exists(os.path.join(path, '..' 'build'):
        return path
      path = os.path.dirname(path)
      if not len(path):
        return None

  def setUp(self):
    # Root output path
    self.temp_path = tempfile.mkdtemp()
    self.addCleanup(shutil.rmtree, self.temp_path)

    # Copy fixture files
    if self.fixture:
      build_path = self._find_build_path()
      if not build_path:
        raise Error('Unable to find build path')
      fixture_path = os.path.join(build_path, 'test', 'fixtures', self.fixture)
      shutil.copytree(fixture_path, self.temp_path)
