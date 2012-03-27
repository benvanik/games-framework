# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'


def UnderscoreToPascalCase(value):
  """Converts a string from underscore_case to PascalCase.

  Args:
    value: Source string value.
        Example: hello_world

  Returns:
    The string, converted to PascalCase.
    Example: hello_world -> HelloWorld
  """
  if not value:
    return value
  def __CapWord(seq):
    for word in seq:
      yield word.capitalize()
  return ''.join(__CapWord(word if word else '_' for word in value.split('_')))
