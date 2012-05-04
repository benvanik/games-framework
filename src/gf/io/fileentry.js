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

goog.provide('gf.io.FileEntry');

goog.require('gf.io.Entry');



/**
 * A file entry.
 *
 * @interface
 * @extends {gf.io.Entry}
 */
gf.io.FileEntry = function() {};


/**
 * Creates a reader for reading from the file.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes. Successful callbacks receive a {@see gf.io.FileReader}.
 */
gf.io.FileEntry.prototype.createReader = goog.nullFunction;


/**
 * Creates a writer for writing to the file.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes. Successful callbacks receive a {@see gf.io.FileWriter}.
 */
gf.io.FileEntry.prototype.createWriter = goog.nullFunction;


/**
 * Reads the entire contents of the file.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes. Successful callbacks receive an ArrayBuffer.
 */
gf.io.FileEntry.prototype.read = goog.nullFunction;


/**
 * Writes the data to the file, overwriting any previous data.
 * @param {!ArrayBuffer} data Data to write to the file.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes.
 */
gf.io.FileEntry.prototype.write = goog.nullFunction;


/**
 * Appends the data to the file.
 * @param {!ArrayBuffer} data Data to append to the file.
 * @return {!goog.async.Deferred} A deferred fulfilled when the request
 *     completes.
 */
gf.io.FileEntry.prototype.append = goog.nullFunction;
