# Copyright 2012 Google Inc. All Rights Reserved.

"""Parser for network message formats.

"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import fileinput
import logging
import os
import re
import subprocess

import pyPEG
from pyPEG import keyword, _and, _not, ignore

from messagefile import MessageFile


def comment():
  return [re.compile(r"//.*"), re.compile("/\*.*?\*/", re.S)]
def literal():
  return re.compile(r'\d*\.\d*|\d+|".*?"')
def symbol():
  return re.compile(r'[\.\w]+')

def number_range():
  return '(', literal, ',', literal, 0, (',', literal), ')'

def array_length():
  return '(', [array_length_open, array_length_fixed], ')'
def array_length_fixed():
  return literal
def array_length_open():
  return '...', literal

def number_type_bool():
  return 'bool'
def number_type_int():
  return 'int', number_range
def number_type_uint():
  return 'uint', number_range
def number_type_float():
  return 'float', number_range
def number_type_int8():
  return 'int8'
def number_type_uint8():
  return 'uint8'
def number_type_int16():
  return 'int16'
def number_type_uint16():
  return 'uint16'
def number_type_int32():
  return 'int32'
def number_type_uint32():
  return 'uint32'
def number_type_float32():
  return 'float32'
def number_type_float64():
  return 'float64'
def number_type():
  return [number_type_bool,
          number_type_int, number_type_uint, number_type_float,
          number_type_int8, number_type_uint8,
          number_type_int16, number_type_uint16,
          number_type_int32, number_type_uint32,
          number_type_float32, number_type_float64,], 0, type_rename

def vec_type_vec3():
  return 'vec3'
def vec_type_vec4():
  return 'vec4'
def vec_type_mat3():
  return 'mat3'
def vec_type_mat4():
  return 'mat4'
def vec_type():
  return [vec_type_vec3, vec_type_vec4,
          vec_type_mat3, vec_type_mat4,]

def string_type():
  return 'string', 0, type_rename, 0, array_length

def binary_type():
  return 'binary', 0, binary_compression, 0, array_length
def binary_compression():
  return '.<', symbol, '>'

def array_type():
  return 'array.<', type_spec, '>', 0, array_length

def map_type():
  return 'map.<', type_spec, ',', type_spec, '>', 0, array_length

def custom_type():
  return symbol

def type_rename():
  return '.<', symbol, '>'
def type_opt():
  return '?'

def type_spec():
  return ([number_type, vec_type, string_type, binary_type, array_type, map_type, custom_type],
          0, type_opt)

def member():
  return type_spec, symbol
def statement():
  return [member], ';'
def block():
  return '{', -1, statement, '}'

def namespace():
  return keyword('namespace'), symbol, ';'
def const():
  return keyword('const'), symbol, '=', literal, ';'
def message():
  return 0, message_fixed, keyword('message'), symbol, 0, message_type, 0, message_id, block, ';'
def message_fixed():
  return 'fixed'
def message_type():
  return '(', symbol, ')'
def message_id():
  return '=', literal

def file_root():
  return -1, [namespace, const, message]


def parse(file_path):
  """Parse the given message file and produce a MessageFile.

  Arg:
    file_path: Source file path.

  Returns:
    A MessageFile instance with the contents of the file.
  """
  ast = pyPEG.parse(language=file_root,
                    lineSource=fileinput.FileInput(file_path),
                    skipWS=True,
                    skipComments=comment,
                    packrat=False,
                    lineCount=True)
  return MessageFile(ast)
