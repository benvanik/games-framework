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

goog.provide('gf.io.FileWriter');

goog.require('goog.disposable.IDisposable');



/**
 * Provides efficient asynchronous write access to files in the file system.
 *
 * @interface
 * @extends {goog.disposable.IDisposable}
 */
gf.io.FileWriter = function() {};


/**
 * @return {number} Length of the file, in bytes.
 */
gf.io.FileWriter.prototype.getLength = goog.nullFunction;


/**
 * Sets the length of the file, either truncating or zero-extending.
 * This method cannot be called while a write is in progress and cannot be
 * overlapped. Wait until the deferred completes until doing anything else with
 * the file.
 * @param {number} value New size, in bytes.
 * @return {!goog.async.Deferred} A deferred fulfilled when the set length has
 *     completed.
 */
gf.io.FileWriter.prototype.setLength = goog.nullFunction;


/**
 * Writes data to the file at the current position.
 * Only one write can be in progress at a time. Wait until the deferred
 * completes before attempting another write.
 * @param {number} offset Offset, in bytes, to write the data to.
 * @param {...ArrayBuffer} var_args ArrayBuffer to write to the file.
 * @return {!goog.async.Deferred} A deferred fulfilled when the write has
 *     completed.
 */
gf.io.FileWriter.prototype.write = goog.nullFunction;
