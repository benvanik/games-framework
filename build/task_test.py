#!/usr/bin/python

# Copyright 2012 Google Inc. All Rights Reserved.

"""Tests for the task module.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import unittest2

from context import BuildEnvironment
from task import *
from test import AsyncTestCase


class SuccessTask(Task):
  def __init__(self, build_env, success_result, *args, **kwargs):
    super(SuccessTask, self).__init__(build_env, *args, **kwargs)
    self.success_result = success_result
  def execute(self):
    return self.success_result

class FailureTask(Task):
  def execute(self):
    raise TypeError('Failed!')


class TaskExecutorTest(AsyncTestCase):
  """Behavioral tests of the TaskExecutor type."""

  def runTestsWithExecutorType(self, executor_cls):
    build_env = BuildEnvironment()

    executor = executor_cls()
    executor.close()
    with self.assertRaises(RuntimeError):
      executor.run_task_async(SuccessTask(build_env, True))
    with self.assertRaises(RuntimeError):
      executor.close()

    with executor_cls() as executor:
      d = executor.run_task_async(SuccessTask(build_env, True))
      executor.wait(d)
      self.assertFalse(executor.has_any_running())
      self.assertCallbackEqual(d, True)
      executor.close()
      self.assertFalse(executor.has_any_running())

    with executor_cls() as executor:
      d = executor.run_task_async(FailureTask(build_env))
      executor.wait(d)
      self.assertFalse(executor.has_any_running())
      self.assertErrbackWithError(d, TypeError)

    with executor_cls() as executor:
      d = executor.run_task_async(SuccessTask(build_env, True))
      executor.wait(d)
      executor.wait(d)
      self.assertFalse(executor.has_any_running())
      self.assertCallback(d)

    with executor_cls() as executor:
      da = executor.run_task_async(SuccessTask(build_env, 'a'))
      executor.wait(da)
      self.assertFalse(executor.has_any_running())
      self.assertCallbackEqual(da, 'a')
      db = executor.run_task_async(SuccessTask(build_env, 'b'))
      executor.wait(db)
      self.assertFalse(executor.has_any_running())
      self.assertCallbackEqual(db, 'b')
      dc = executor.run_task_async(SuccessTask(build_env, 'c'))
      executor.wait(dc)
      self.assertFalse(executor.has_any_running())
      self.assertCallbackEqual(dc, 'c')

    with executor_cls() as executor:
      da = executor.run_task_async(SuccessTask(build_env, 'a'))
      db = executor.run_task_async(SuccessTask(build_env, 'b'))
      dc = executor.run_task_async(SuccessTask(build_env, 'c'))
      executor.wait([da, db, dc])
      self.assertFalse(executor.has_any_running())
      self.assertCallbackEqual(dc, 'c')
      self.assertCallbackEqual(db, 'b')
      self.assertCallbackEqual(da, 'a')

    with executor_cls() as executor:
      da = executor.run_task_async(SuccessTask(build_env, 'a'))
      db = executor.run_task_async(FailureTask(build_env))
      dc = executor.run_task_async(SuccessTask(build_env, 'c'))
      executor.wait(da)
      self.assertCallbackEqual(da, 'a')
      executor.wait(db)
      self.assertErrbackWithError(db, TypeError)
      executor.wait(dc)
      self.assertCallbackEqual(dc, 'c')
      self.assertFalse(executor.has_any_running())

    # This test is not quite right - it's difficult to test for proper
    # early termination
    with executor_cls() as executor:
      executor.close(graceful=False)
      self.assertFalse(executor.has_any_running())

  def testInProcess(self):
    self.runTestsWithExecutorType(InProcessTaskExecutor)

  def testMultiprocess(self):
    self.runTestsWithExecutorType(MultiProcessTaskExecutor)


if __name__ == '__main__':
  unittest2.main()
