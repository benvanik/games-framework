# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'


import string


def is_rule_path(value):
  """Detects whether the given value is a rule name.

  Returns:
    True if the string is a valid rule name.
  """
  # NOTE: in the future this could be made to support modules/etc by looking
  #     for any valid use of ':'
  return isinstance(value, str) and len(value) and string.find(value, ':') >= 0


def validate_names(values, require_semicolon=False):
  """Validates a list of rule names to ensure they are well-defined.

  Args:
    values: A list of values to validate.
    require_semicolon: Whether to require a :

  Raises:
    NameError: A rule value is not valid.
  """
  if not values:
    return
  for value in values:
    if not isinstance(value, str) or not len(value):
      raise TypeError('Names must be a string of non-zero length')
    if len(value.strip()) != len(value):
      raise NameError(
          'Names cannot have leading/trailing whitespace: "%s"' % (value))
    if require_semicolon and string.find(value, ':') == -1:
      raise NameError('Names must be a rule (contain a :): "%s"' % (value))


def underscore_to_pascalcase(value):
  """Converts a string from underscore_case to PascalCase.

  Args:
    value: Source string value.
        Example - hello_world

  Returns:
    The string, converted to PascalCase.
    Example - hello_world -> HelloWorld
  """
  if not value:
    return value
  def __CapWord(seq):
    for word in seq:
      yield word.capitalize()
  return ''.join(__CapWord(word if word else '_' for word in value.split('_')))


class Deferred(object):
  """A simple deferred object, designed for single-threaded tracking of futures.
  """

  def __init__(self):
    """Initializes a deferred."""
    self._callbacks = []
    self._errbacks = []
    self._is_done = False
    self._failed = False
    self._args = None
    self._kwargs = None

  def is_done(self):
    """Whether the deferred has completed (either succeeded or failed).

    Returns:
      True if the deferred has completed.
    """
    return self._is_done

  def add_callback_fn(self, fn):
    """Adds a function that will be called when the deferred completes
    successfully.

    The arguments passed to the function will be those arguments passed to
    callback. If multiple callbacks are registered they will all be called with
    the same arguments, so don't modify them.

    If the deferred has already completed when this function is called then the
    callback will be made immediately.

    Args:
      fn: Function to call back.
    """
    if self._is_done:
      if not self._failed:
        fn(*self._args, **self._kwargs)
      return
    self._callbacks.append(fn)

  def add_errback_fn(self, fn):
    """Adds a function that will be called when the deferred completes with
    an error.

    The arguments passed to the function will be those arguments passed to
    errback. If multiple callbacks are registered they will all be called with
    the same arguments, so don't modify them.

    If the deferred has already completed when this function is called then the
    callback will be made immediately.

    Args:
      fn: Function to call back.
    """
    if self._is_done:
      if self._failed:
        fn(*self._args, **self._kwargs)
      return
    self._errbacks.append(fn)

  def callback(self, *args, **kwargs):
    """Completes a deferred successfully and calls any registered callbacks."""
    assert not self._is_done
    self._is_done = True
    self._args = args
    self._kwargs = kwargs
    callbacks = self._callbacks
    self._callbacks = []
    self._errbacks = []
    for fn in callbacks:
      fn(*args, **kwargs)

  def errback(self, *args, **kwargs):
    """Completes a deferred with an error and calls any registered errbacks."""
    assert not self._is_done
    self._is_done = True
    self._failed = True
    self._args = args
    self._kwargs = kwargs
    errbacks = self._errbacks
    self._callbacks = []
    self._errbacks = []
    for fn in errbacks:
      fn(*args, **kwargs)
