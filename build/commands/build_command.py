# Copyright 2012 Google Inc. All Rights Reserved.

"""Management shell 'build' command.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import argparse
import os
import sys

import build.commands.util as commandutil
from build.manage import manage_command


def _get_options_parser():
  """Gets an options parser for the given args."""
  parser = argparse.ArgumentParser(prog='manage.py build')

  # Add all common args
  commandutil.add_common_args(parser)
  commandutil.add_common_build_args(parser, targets=True)

  # 'build' specific

  return parser


@manage_command('build', 'Builds target rules.')
def build(args, cwd):
  parser = _get_options_parser()
  parsed_args = parser.parse_args(args)

  (result, all_target_outputs) = commandutil.run_build(cwd, parsed_args)

  print all_target_outputs

  return result
