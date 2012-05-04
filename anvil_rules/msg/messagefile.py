# Copyright 2012 Google Inc. All Rights Reserved.

"""MessageFile types.

"""

# TODO(benvanik): write tests
# TODO(benvanik): add proper pydoc comments
# TODO(benvanik): scrub for style guide
# TODO(benvanik): more logging

__author__ = 'benvanik@google.com (Ben Vanik)'


import logging
import os


class MessageFile(object):
  """Represents a message file.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root.
    """
    self.namespace = 'unknown'
    self.constants = []
    self.messages = []
    self.public_messages = []
    self.named_messages = {}
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'namespace':
        self.namespace = node_value[0][1]
      elif node_name == 'const':
        self.constants.append({
            'name': node_value[0][1],
            'value': int(node_value[1][1]),
            })
      elif node_name == 'message':
        message = Message(node_value)
        if message.id != None:
          self.public_messages.append(message)
        self.named_messages[message.name] = message
        self.messages.append(message)
      else:
        logging.info('Unknown AST node: %s' % (node_name))

  def get_public_messages(self):
    """Called from the template to get all public messages.
    Do not rename.
    """
    messages = []
    for message in self.messages:
      if message.message_id != None:
        messages.append(message)
    return messages

  def get_consts(self):
    """Called from the template to get all constants.
    Do not rename.
    """
    consts = []
    for key in self.constants:
      consts.append({
          'key': key,
          'value': self.constants[key],
          })
    return consts


class Message(object):
  """Represents a message structure.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this message.
    """
    self.name = None
    self.id = None
    self.type_name = None
    self.fixed = False
    self.members = []
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'symbol':
        self.name = node_value
      elif node_name == 'message_fixed':
        self.fixed = True
      elif node_name == 'message_id':
        self.id = int(node_value[0][1])
      elif node_name == 'message_type':
        self.type_name = node_value[0][1]
      elif node_name == 'block':
        self.__ParseBlock(node_value)
      else:
        logging.info('Unknown AST node in message: %s' % (node_name))

  def __ParseBlock(self, ast):
    """Parses a block of statements."""
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'statement':
        self.__ParseStatement(node_value)
      else:
        logging.info('Unknown AST node in message block: %s' % (node_name))

  def __ParseStatement(self, ast):
    """Parses a statement."""
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'member':
        self.members.append(Member(node_value))
      else:
        logging.info('Unknown AST node in message statement: %s' % (node_name))


class Member(object):
  """Represents a member value of a message.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this member.
    """
    type_node = ast[0][1]
    self.type = ParseType(type_node)
    self.name = ast[1][1]

  def closure_type(self):
    return 'closure_type'

  def default_value(self):
    return self.type.default_value

  def __repr__(self):
    return '%s %s' % (self.type, self.name)


class NumberRange(object):
  """Represents a numeric range, including error tolerance.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    self.min = float(ast[0][1])
    self.max = float(ast[1][1])
    self.error = 0
    if len(ast) > 2:
      self.error = float(ast[2][1])

  def __repr__(self):
    return '%s, %s, %s' % (self.min, self.max, self.error)


class ArrayLength(object):
  """Represents an array/string/map length range.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    type_node = ast[0]
    if type_node[0] == 'array_length_fixed':
      self.min = self.max = int(type_node[1][0][1])
    elif type_node[0] == 'array_length_open':
      self.min = 0
      self.max = int(type_node[1][0][1])

  def __repr__(self):
    return '%s, %s' % (self.min, self.max)


def ParseType(ast):
  """Parses a type_spec value.
  Args:
    ast: AST node root for this type.
  """
  type_node = ast[0]
  type_name = type_node[0]
  if type_name == 'number_type':
    type = NumberType(type_node[1])
  elif type_name == 'vec_type':
    type = VecType(type_node[1])
  elif type_name == 'string_type':
    type = StringType(type_node[1])
  elif type_name == 'binary_type':
    type = BinaryType(type_node[1])
  elif type_name == 'array_type':
    type = ArrayType(type_node[1])
  elif type_name == 'map_type':
    type = MapType(type_node[1])
  elif type_name == 'custom_type':
    type = CustomType(type_node[1])
  else:
    logging.info('Unknown AST type: %s' % (type_name))
    return None
  for node in ast[1:]:
    node_name = node[0]
    node_value = node[1]
    if node_name == 'type_opt':
      type.is_optional = True
  return type


class MemberType(object):
  """Base type for member types.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    self.rename = None
    self.is_optional = False
    self.is_vec = False
    self.is_string = False
    self.is_binary = False
    self.is_array = False
    self.is_map = False
    self.is_custom = False

  def get_closure_cast(self):
    if self.rename:
      return '/** @type {%s} */' % (self.rename)
    return ''


class NumberType(MemberType):
  """Numeric type.
  """

  __NAME_MAP = {
    'number_type_bool': 'bool',
    'number_type_int': 'int',
    'number_type_uint': 'uint',
    'number_type_float': 'float',
    'number_type_int8': 'int8',
    'number_type_uint8': 'uint8',
    'number_type_int16': 'int16',
    'number_type_uint16': 'uint16',
    'number_type_int32': 'int32',
    'number_type_uint32': 'uint32',
    'number_type_float32': 'float32',
    'number_type_float64': 'float64',
  }

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    MemberType.__init__(self, ast)
    self.name = self.__NAME_MAP[ast[0][0]]
    self.range = None
    self.default_value = '0'
    for node in ast[0][1]:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'number_range':
        self.range = NumberRange(node_value)
    for node in ast[1:]:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'type_rename':
        self.rename = node_value[0][1]
    if self.rename:
      self.default_value = self.get_closure_cast() + ' (0)'

  def get_closure_type(self, prefix = '', message_file = None):
    if self.rename:
      s = self.rename
    else:
      s = 'number'
    if self.is_optional:
      s = s + '?'
    return s

  def get_read_method(self):
    if self.name == 'bool':
      return 'readUint8'
    elif self.name == 'int':
      # TODO(benvanik): variable
      return 'readInt32'
    elif self.name == 'uint':
      # TODO(benvanik): variable
      return 'readUint32'
    elif self.name == 'int8':
      return 'readInt8'
    elif self.name == 'uint8':
      return 'readUint8'
    elif self.name == 'int16':
      return 'readInt16'
    elif self.name == 'uint16':
      return 'readUint16'
    elif self.name == 'int32':
      return 'readInt32'
    elif self.name == 'uint32':
      return 'readUint32'
    elif self.name == 'float32':
      return 'readFloat32'
    elif self.name == 'float64':
      return 'readFloat64'

  def get_write_method(self):
    if self.name == 'bool':
      return 'writeUint8'
    elif self.name == 'int':
      # TODO(benvanik): variable
      return 'writeInt32'
    elif self.name == 'uint':
      # TODO(benvanik): variable
      return 'writeUint32'
    elif self.name == 'int8':
      return 'writeInt8'
    elif self.name == 'uint8':
      return 'writeUint8'
    elif self.name == 'int16':
      return 'writeInt16'
    elif self.name == 'uint16':
      return 'writeUint16'
    elif self.name == 'int32':
      return 'writeInt32'
    elif self.name == 'uint32':
      return 'writeUint32'
    elif self.name == 'float32':
      return 'writeFloat32'
    elif self.name == 'float64':
      return 'writeFloat64'

  def __repr__(self):
    s = '%s' % (self.name)
    if self.range:
      s += '(%s)' % (self.range)
    if self.rename:
      s += '[%s]' % (self.rename)
    if self.is_optional:
      s += '?'
    return s


class VecType(MemberType):
  """Vector type.
  """

  __NAME_MAP = {
    'vec_type_vec3': 'goog.vec.Vec3',
    'vec_type_vec4': 'goog.vec.Vec4',
    'vec_type_mat3': 'goog.vec.Mat3',
    'vec_type_mat4': 'goog.vec.Mat4',
  }

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    MemberType.__init__(self, ast)
    self.name = self.__NAME_MAP[ast[0][0]]
    self.range = None
    self.default_value = self.name + '.createFloat32()'
    self.is_vec = True
    # for node in ast[0][1]:
    #   node_name = node[0]
    #   node_value = node[1]
    #   if node_name == 'number_range':
    #     self.range = NumberRange(node_value)

  def get_closure_type(self, prefix = '', message_file = None):
    s = self.name + '.Type'
    if not self.is_optional:
      s = '!' + s
    return s

  def get_read_method(self):
    if self.name == 'goog.vec.Vec3':
      return 'readVec3'
    elif self.name == 'goog.vec.Vec4':
      return 'readVec4'
    elif self.name == 'goog.vec.Mat3':
      return 'readMat3'
    elif self.name == 'goog.vec.Mat4':
      return 'readMat4'

  def get_write_method(self):
    if self.name == 'goog.vec.Vec3':
      return 'writeVec3'
    elif self.name == 'goog.vec.Vec4':
      return 'writeVec4'
    elif self.name == 'goog.vec.Mat3':
      return 'writeMat3'
    elif self.name == 'goog.vec.Mat4':
      return 'writeMat4'

  def __repr__(self):
    s = '%s' % (self.name)
    if self.range:
      s += '(%s)' % (self.range)
    if self.is_optional:
      s += '?'
    return s


class StringType(MemberType):
  """String type.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    MemberType.__init__(self, ast)
    self.length = None
    self.default_value = '\'\''
    self.is_string = True
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'type_rename':
        self.rename = node_value[0][1]
      elif node_name == 'array_length':
        self.length = ArrayLength(node_value)
    if self.rename:
      self.default_value = self.get_closure_cast() + ' (\'\')'

  def get_closure_type(self, prefix = '', message_file = None):
    if self.rename:
      s = self.rename
    else:
      s = 'string'
    if self.is_optional:
      s += '?'
    return s

  def get_read_method(self):
    return 'readString'

  def get_write_method(self):
    return 'writeString'

  def __repr__(self):
    s = 'string'
    if self.length:
      s += '(%s)' % (self.length)
    if self.rename:
      s += '[%s]' % (self.rename)
    if self.is_optional:
      s += '?'
    return s


class BinaryType(MemberType):
  """Binary type.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    MemberType.__init__(self, ast)
    self.compression = None
    self.length = None
    self.is_binary = True
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'binary_compression':
        self.compression = node_value[0][1]
      elif node_name == 'array_length':
        self.length = ArrayLength(node_value)
    if self.length and self.length.min == self.length.max:
      self.default_value = 'new Uint8Array(%s)' % (self.length.max)
    else:
      self.default_value = 'new Uint8Array(0)'

  def get_closure_type(self, prefix = '', message_file = None):
    s = 'Uint8Array'
    if not self.is_optional:
      s = '!' + s
    return s

  def __repr__(self):
    s = 'binary'
    if self.length:
      s += '(%s)' % (self.length)
    if self.is_optional:
      s += '?'
    return s


class ArrayType(MemberType):
  """Array type.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    MemberType.__init__(self, ast)
    self.length = None
    self.element_type = None
    self.default_value = '[]'
    self.is_array = True
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'array_length':
        self.length = ArrayLength(node_value)
      elif node_name == 'type_spec':
        self.element_type = ParseType(node_value)

  def get_closure_type(self, prefix = '', message_file = None):
    s = 'Array.<%s>' % (self.element_type.get_closure_type(prefix,
                                                           message_file))
    if not self.is_optional:
      s = '!' + s
    return s

  def __repr__(self):
    s = 'array.<%s>' % (self.element_type)
    if self.length:
      s += '(%s)' % (self.length)
    if self.rename:
      s += '[%s]' % (self.rename)
    if self.is_optional:
      s += '?'
    return s


class MapType(MemberType):
  """Map type.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    MemberType.__init__(self, ast)
    self.length = None
    self.key_type = None
    self.value_type = None
    self.default_value = '{}'
    self.is_map = True
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'array_length':
        self.length = ArrayLength(node_value)
      elif node_name == 'type_spec':
        type_value = ParseType(node_value)
        if not self.key_type:
          self.key_type = type_value
        else:
          self.value_type = type_value

  def get_closure_type(self, prefix = '', message_file = None):
    s = 'Object.<%s, %s>' % (self.key_type.get_closure_type(prefix,
                                                            message_file),
                             self.value_type.get_closure_type(prefix,
                                                              message_file))
    if not self.is_optional:
      s = '!' + s
    return s

  def __repr__(self):
    s = 'map.<%s, %s>' % (self.key_type, self.value_type)
    if self.length:
      s += '(%s)' % (self.length)
    if self.rename:
      s += '[%s]' % (self.rename)
    if self.is_optional:
      s += '?'
    return s


class CustomType(MemberType):
  """Custom type.
  """

  def __init__(self, ast):
    """
    Args:
      ast: AST node root for this type.
    """
    MemberType.__init__(self, ast)
    self.type = None
    self.default_value = 'null'
    self.is_custom = True
    for node in ast:
      node_name = node[0]
      node_value = node[1]
      if node_name == 'symbol':
        self.type = node_value

  def get_custom_name(self, message_file):
    named_message = message_file.named_messages.get(self.type, None)
    if named_message and named_message.type_name:
      return named_message.type_name
    else:
      return message_file.namespace + '.' + self.type

  def get_closure_type(self, prefix = '', message_file = None):
    named_message = message_file.named_messages.get(self.type, None)
    if named_message and named_message.type_name:
      s = named_message.type_name
    else:
      s = prefix + self.type
    if not self.is_optional:
      s = '!' + s
    return s

  def __repr__(self):
    s = '%s' % (self.type)
    if self.is_optional:
      s += '?'
    return s
