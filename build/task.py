# Copyright 2012 Google Inc. All Rights Reserved.

"""Task/multiprocessing support.
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import multiprocessing
import os

from async import Deferred


class Task(object):
  """Abstract base type for small tasks.
  A task should be the smallest possible unit of work a Rule may want to
  perform. Examples include copying a set of files, converting an mp3, or
  compiling some code.

  Tasks can execute in parallel with other tasks, and are run in a seperate
  process. They must be pickleable and should access no global state.

  TODO(benvanik): add support for logging - a Queue that pushes back
      log/progress messages?
  """

  def __init__(self, build_env, *args, **kwargs):
    """Initializes a task.

    Args:
      build_env: The build environment to use when requiring state.
    """
    self.build_env = build_env

  def execute(self):
    """Executes the task.
    This method will be called in a separate process and should not use any
    state not accessible from the Task. The Task will have been pickled and
    will not be merged back with the parent.

    The result of this method must be pickleable and will be sent back to the
    deferred callback. If an exception is raised it will be wrapped in the
    deferred's errback.

    Returns:
      A result to pass back to the deferred callback.
    """
    raise NotImplementedError()


class TaskExecutor(object):
  """An abstract queue for task execution.
  """

  def __init__(self, *args, **kwargs):
    """Initializes a task executor.
    """
    self.closed = False
    self._running_count = 0

  def __enter__(self):
    return self

  def __exit__(self, type, value, traceback):
    if not self.closed:
      self.close()

  def has_any_running(self):
    """
    Returns:
      True if there are any tasks still running.
    """
    return self._running_count > 0

  def run_task_async(self, task):
    """Queues a new task for execution.

    Args:
      task: Task object to execute on a worker thread.

    Returns:
      A deferred that signals completion of the task. The results of the task
      will be passed to the callback.

    Raises:
      RuntimeError: Invalid executor state.
    """
    raise NotImplementedError()

  def wait(self, deferreds):
    """Blocks waiting on a list of deferreds until they all complete.
    This should laregly be used for testing. The deferreds must have been
    returned from run_task_async.

    Args:
      deferreds: A list of Deferreds (or one).
    """
    raise NotImplementedError()


  def close(self, graceful=True):
    """Closes the executor, waits for all tasks to complete, and joins.
    This will block until tasks complete.

    Args:
      graceful: True to allow outstanding tasks to complete.

    Raises:
      RuntimeError: Invalid executor state.
    """
    raise NotImplementedError()


class InProcessTaskExecutor(TaskExecutor):
  """A simple inline task executor.
  Blocks on task execution, performing all tasks in the running process.
  This makes testing simpler as all deferreds are complete upon callback.
  """

  def __init__(self, *args, **kwargs):
    """Initializes a task executor.
    """
    super(InProcessTaskExecutor, self).__init__(*args, **kwargs)

  def run_task_async(self, task):
    if self.closed:
      raise RuntimeError('Executor has been closed and cannot run new tasks')

    deferred = Deferred()
    try:
      result = task.execute()
      deferred.callback(result)
    except Exception as e:
      deferred.errback(exception=e)
    return deferred

  def wait(self, deferreds):
    pass

  def close(self, graceful=True):
    if self.closed:
      raise RuntimeError(
          'Attempting to close an executor that has already been closed')
    self.closed = True
    self._running_count = 0


class MultiProcessTaskExecutor(TaskExecutor):
  """A pool for multiprocess task execution.
  """

  def __init__(self, worker_count=None, *args, **kwargs):
    """Initializes a task executor.
    This may take a bit to run, as the process pool is primed.

    Args:
      worker_count: Number of worker threads to use when building. None to use
          as many processors as are available.
    """
    super(MultiProcessTaskExecutor, self).__init__(*args, **kwargs)
    self.worker_count = worker_count
    self._pool = multiprocessing.Pool(processes=self.worker_count,
                                      initializer=_task_initializer)
    self._waiting_deferreds = {}

  def run_task_async(self, task):
    if self.closed:
      raise RuntimeError('Executor has been closed and cannot run new tasks')

    # Pass on results to the defered
    deferred = Deferred()
    def _thunk_callback(*args, **kwargs):
      self._running_count = self._running_count - 1
      del self._waiting_deferreds[deferred]
      if len(args) and isinstance(args[0], Exception):
        deferred.errback(exception=args[0])
      else:
        deferred.callback(*args)

    # Queue
    self._running_count = self._running_count + 1
    async_result = self._pool.apply_async(_task_thunk, [task],
        callback=_thunk_callback)
    self._waiting_deferreds[deferred] = async_result

    return deferred

  def wait(self, deferreds):
    try:
      iter(deferreds)
    except:
      deferreds = [deferreds]
    for deferred in deferreds:
      if deferred.is_done():
        continue
      async_result = self._waiting_deferreds[deferred]
      async_result.wait()

  def close(self, graceful=True):
    if self.closed:
      raise RuntimeError(
          'Attempting to close an executor that has already been closed')
    self.closed = True
    if graceful:
      self._pool.close()
    else:
      self._pool.terminate()
    self._pool.join()
    self._running_count = 0
    self._waiting_deferreds.clear()

def _task_initializer(): # pragma: no cover
  """Task executor process initializer, used by MultiProcessTaskExecutor.
  Called once on each process the TaskExecutor uses.
  """
  #print 'started! %s' % (multiprocessing.current_process().name)
  pass

def _task_thunk(task): # pragma: no cover
  """Thunk for executing tasks, used by MultiProcessTaskExecutor.
  This is called from separate processes so do not access any global state.

  Args:
    task: Task to execute.

  Returns:
    The result of the task execution. This is passed to the deferred.
  """
  try:
    return task.execute()
  except Exception as e:
    return e
