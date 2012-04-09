# Copyright 2012 Google Inc. All Rights Reserved.

"""Cleans all build-* paths and caches.
Attempts to delete all paths the build system creates.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import argparse
import os
import shutil
import sys

import build.commands.util as commandutil
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

  return commandutil.clean_output(cwd)
