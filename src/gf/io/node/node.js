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
 * @fileoverview Node filesystem utilities and constants.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.io.node');

goog.require('gf.io.Error');
goog.require('gf.io.ErrorCode');
goog.require('gf.log');


/**
 * Root path in the OS file system where persistent GF file systems will be
 * created.
 * This must be set before any file systems are initialized.
 * @type {string}
 */
gf.io.node.persistentRoot = '/tmp/gfio/persistent/';


/**
 * Root path in the OS file system where temporary GF file systems will be
 * created. Should be under /tmp/.
 * This must be set before any file systems are initialized.
 * @type {string}
 */
gf.io.node.temporaryRoot = '/tmp/gfio/temporary/';


/**
 * Converts a goog.fs file system error to a gf.io error.
 * @param {!Error} err goog.fs error.
 * @param {string} action Action occuring when the error was raised.
 * @return {!gf.io.Error} File error.
 */
gf.io.node.convertError = function(err, action) {
  var code = gf.io.ErrorCode.SECURITY;
  switch (err.code) {
    // TODO(benvanik): more error types
    case 'ENOENT':
      code = gf.io.ErrorCode.NOT_FOUND;
      break;
    default:
      gf.log.write('unhandled error type: ' + err.code);
      break;
  }
  return new gf.io.Error(code, action);
};
