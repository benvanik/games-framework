# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'


def is_rule_name(value):
  """Detects whether the given value is a rule name.

  Returns:
    True if the string is a valid rule name.
  """
  # NOTE: in the future this could be made to support modules/etc by looking
  #     for any valid use of ':'
  return isinstance(value, str) and len(value) and value[0] == ':'


def validate_names(values, require_semicolon=False):
  """Validates a list of rule names to ensure they are well-defined.

  Args:
    values: A list of values to validate.
    require_semicolon: Whether to require a leading :

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
    if require_semicolon and value[0] != ':':
      raise NameError('Names must be a rule (start with :): "%s"' % (value))


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
