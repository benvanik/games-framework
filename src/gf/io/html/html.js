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
 * @fileoverview HTML file system utilities and constants.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.io.html');

goog.require('gf.io.Error');


/**
 * Converts a goog.fs file system error to a gf.io error.
 * @param {goog.fs.Error} err goog.fs error.
 * @param {string} action Action occuring when the error was raised.
 * @return {!gf.io.Error} File error.
 */
gf.io.html.convertError = function(err, action) {
  return new gf.io.Error(
      /** @type {gf.io.ErrorCode} */ (err ? err.code : 0), action);
};
