# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'


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
