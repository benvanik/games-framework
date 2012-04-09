# Copyright 2012 Google Inc. All Rights Reserved.

"""Common command utilities.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import argparse


def add_common_build_args(parser):
  """Adds common build arguments to an argument parser.

  Args:
    parser: ArgumentParser to modify.
  """
  # Threading/execution control
  parser.add_argument('-j', '--jobs',
                      dest='jobs',
                      type=int,
                      default=None,
                      help=('Specifies the number of tasks to run '
                            'simultaneously. If omitted then all processors '
                            'will be used.'))
