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

goog.provide('gf.io.FileReader');

goog.require('goog.disposable.IDisposable');



/**
 * Provides efficient asynchronous read access to files in the file system.
 *
 * @interface
 * @extends {goog.disposable.IDisposable}
 */
gf.io.FileReader = function() {};


/**
 * @return {number} Length of the file, in bytes.
 */
gf.io.FileReader.prototype.getLength = goog.nullFunction;


/**
 * Read data from the file at the current position.
 *
 * If the starting offset is at the end of the file an INVALID_STATE error
 * will be emitted. If a size is specified such that the end is past the end
 * of the file the new end will be set to the end of the file.
 *
 * @param {number=} opt_offset Starting offset, in bytes, to begin reading at.
 * @param {number=} opt_size Number of bytes to read, or omit for full file.
 * @param {ArrayBuffer=} opt_value Buffer to hold the data.
 * @return {!goog.async.Deferred} A deferred fulfilled when the read has
 *     completed. Successful callbacks receive an ArrayBuffer as their only
 *     argument, which may not be the given buffer if it was improperly sized.
 */
gf.io.FileReader.prototype.read = goog.nullFunction;
