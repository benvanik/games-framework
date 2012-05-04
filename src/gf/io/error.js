/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.io.Error');
goog.provide('gf.io.ErrorCode');

goog.require('goog.debug.Error');


/**
 * Error codes used by the IO types.
 * Maps to the error codes defined in the HTML file system specification.
 * http://dev.w3.org/2009/dap/file-system/file-dir-sys.html#error-code-descriptions
 * @enum {number}
 */
gf.io.ErrorCode = {
  /** File or directory could not be found. */
  NOT_FOUND: 1,
  /** Unsafe file access or out of resources. */
  SECURITY: 2,
  /** Request aborted by the user/system. */
  ABORT: 3,
  /** File cannot be read, may be locked by another application. */
  NOT_READABLE: 4,
  /** URL provided is malformed. */
  ENCODING: 5,
  /** File cannot be written, may be locked by another appplication. */
  NO_MODIFICATION_ALLOWED: 6,
  /** Attempting to perform an invalid operation on a file. */
  INVALID_STATE: 7,
  /** Invalid line ending specification provided. */
  SYNTAX: 8,
  /** Invalid operation requested, such as moving a directory into itself. */
  INVALID_MODIFICATION: 9,
  /** Operation denied because it would cause the quota to be exceeded. */
  QUOTA_EXCEEDED: 10,
  /** User requested a file but a directory was found, or vs. */
  TYPE_MISMATCH: 11,
  /** Failed to create a file or directory because it already exists. */
  PATH_EXISTS: 12
};



/**
 * A file system error.
 *
 * @constructor
 * @extends {goog.debug.Error}
 * @param {gf.io.ErrorCode} code Error code from the API.
 * @param {string} action Action being undertaken when the error was raised.
 */
gf.io.Error = function(code, action) {
  goog.base(this,
      action + ': ' + gf.io.Error.getDebugMessage(code));

  /**
   * Error code from the underlying file system API.
   * @type {gf.io.ErrorCode}
   */
  this.code = code;

  /**
   * The action that raised the error.
   * @type {string}
   */
  this.action = action;
};
goog.inherits(gf.io.Error, goog.debug.Error);


/**
 * Converts a file error into a human-readable string for debugging.
 * @param {gf.io.ErrorCode} value Error code.
 * @return {string} A human readable string.
 */
gf.io.Error.getDebugMessage = function(value) {
  switch (value) {
    case gf.io.ErrorCode.NOT_FOUND:
      return 'File or directory not found';
    case gf.io.ErrorCode.SECURITY:
      return 'Insecure or disallowed operation';
    case gf.io.ErrorCode.ABORT:
      return 'Operation aborted';
    case gf.io.ErrorCode.NOT_READABLE:
      return 'File or directory not readable';
    case gf.io.ErrorCode.ENCODING:
      return 'Invalid encoding';
    case gf.io.ErrorCode.NO_MODIFICATION_ALLOWED:
      return 'Cannot modify file or directory';
    case gf.io.ErrorCode.INVALID_STATE:
      return 'Invalid state';
    case gf.io.ErrorCode.SYNTAX:
      return 'Invalid line-ending specifier';
    case gf.io.ErrorCode.INVALID_MODIFICATION:
      return 'Invalid modification';
    case gf.io.ErrorCode.QUOTA_EXCEEDED:
      return 'Quota exceeded';
    case gf.io.ErrorCode.TYPE_MISMATCH:
      return 'Invalid filetype';
    case gf.io.ErrorCode.PATH_EXISTS:
      return 'File or directory already exists at specified path';
    default:
      return 'Unknown error';
  }
};
