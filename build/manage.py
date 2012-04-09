#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Management shell script.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import fnmatch
import imp
import os
import sys

import util


def manage_command(command_name):
  """A decorator for management command functions.
  Use this to register management command functions. A function decorated with
  this will be discovered and callable via manage.py.

  Functions are expected to take (args, cwd) and return an error number that
  will be passed back to the shell.

  Args:
    command_name: The name of the command exposed to the management script.
  """
  def _exec_command(fn):
    fn.command_name = command_name
    return fn
  return _exec_command


def discover_commands(search_path=None):
  """Looks for all commands and returns a dictionary of them.
  Commands are looked for under build/commands/, and should be functions
  decorated with @manage_command.

  Args:
    search_path: Search path to use instead of the default.

  Returns:
    A dictionary containing command-to-function mappings.

  Raises:
    KeyError: Multiple commands have the same name.
  """
  commands = {}
  if not search_path:
    build_path = util.find_build_path()
    commands_path = os.path.join(build_path, 'commands')
  else:
    commands_path = search_path
  for (root, dirs, files) in os.walk(commands_path):
    for name in files:
      if fnmatch.fnmatch(name, '*.py'):
        full_path = os.path.join(root, name)
        module = imp.load_source(os.path.splitext(name)[0], full_path)
        for attr_name in dir(module):
          if hasattr(getattr(module, attr_name), 'command_name'):
            command_fn = getattr(module, attr_name)
            command_name = command_fn.command_name
            if commands.has_key(command_name):
              raise KeyError('Command "%s" already defined' % (command_name))
            commands[command_name] = command_fn
  return commands


def usage(commands):
  """Gets usage info that can be displayed to the user.

  Args:
    commands: A command dictionary from discover_commands.

  Returns:
    A string containing usage info and a command listing.
  """
  return 'TODO: usage info/command list/etc'


def main(args=None, cwd=None, commands=None):
  """
  Args:
    args: Arguments, with the command to execute as the first.
    cwd: Current working directory override.
    commands: A command dictionary from discover_commands to override the
        defaults.

  Returns:
    0 if the command succeeded and non-zero otherwise.

  Raises:
    ValueError: The command could not be found or was not specified.
  """
  args = args if args else []
  cwd = cwd if cwd else os.getcwd()

  commands = commands if commands else discover_commands()

  if not len(args):
    raise ValueError('No command given')
  command_name = args[0]
  if not commands.has_key(command_name):
    raise ValueError('Command "%s" not found' % (command_name))

  command_fn = commands[command_name]
  return command_fn(args[1:], cwd)


if __name__ == '__main__':
  # Always add build/.. to the path
  sys.path.insert(1, os.path.normpath(os.path.join(os.path.dirname(__file__),
                                                   '..')))

  try:
    return_code = main(args=sys.argv[1:], cwd=os.getcwd())
  except Exception as e:
    #print e
    raise
    return_code = 1
  sys.exit(return_code)
