# Copyright 2012 Google Inc. All Rights Reserved.

"""Management shell 'clean' command.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import argparse
import os
import shutil
import sys

import build.commands.util as commandutil
from build.context import BuildEnvironment
from build.manage import manage_command


def _get_options_parser():
  """Gets an options parser for the given args."""
  parser = argparse.ArgumentParser(prog='manage.py clean')

  # Add all common args
  commandutil.add_common_args(parser)

  # 'clean' specific

  return parser


@manage_command('clean', 'Cleans outputs and caches.')
def clean(args, cwd):
  parser = _get_options_parser()
  parsed_args = parser.parse_args(args)

  build_env = BuildEnvironment(root_path=cwd)

  def attempt_delete(path):
    if os.path.isdir(path):
      print 'Deleting %s...' % (path)
      shutil.rmtree(path)

  nuke_paths = [
      '.build-cache',
      'build-out',
      'build-gen',
      'build-bin',
      ]
  for path in nuke_paths:
    attempt_delete(path)

  return True
