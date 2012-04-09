# Copyright 2012 Google Inc. All Rights Reserved.

"""Management shell 'build' command.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os
import sys

from manage import manage_command


@manage_command('build')
def build(args, cwd):
  print 'build!'
  return 0
