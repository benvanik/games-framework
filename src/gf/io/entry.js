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

goog.provide('gf.io.Entry');



/**
 * Base file system entry type.
 *
 * @interface
 */
gf.io.Entry = function() {};


/**
 * The type of the file system entry.
 * @enum {number}
 */
gf.io.Entry.Type = {
  /** The entry is a file ({@see gf.io.FileEntry}). */
  FILE: 0,
  /** The entry is a directory ({@see gf.io.DirectoryEntry}). */
  DIRECTORY: 1
};


/**
 * The file system that this entry is from.
 * @type {!gf.io.FileSystem}
 */
gf.io.Entry.prototype.fileSystem;


/**
 * The full path of the entry in the file system.
 * @type {string}
 */
gf.io.Entry.prototype.fullPath;


/**
 * The name of the entry.
 * @type {string}
 */
gf.io.Entry.prototype.name;


/**
 * Type of the entry.
 * @type {gf.io.Entry.Type}
 */
gf.io.Entry.prototype.type;


/**
 * @return {boolean} Whether or not this entry is a file.
 */
gf.io.Entry.prototype.isFile = goog.nullFunction;


/**
 * @return {boolean} Whether or not this entry is a directory.
 */
gf.io.Entry.prototype.isDirectory = goog.nullFunction;


/**
 * Queries an entry for its parent.
 * @return {!goog.async.Deferred} A deferred fulfilled when the query completes.
 *     Successful callbacks receive a {@see gf.io.Entry} for the parent, or
 *     null if the entry is the root of the file system.
 */
gf.io.Entry.prototype.queryParentEntry = goog.nullFunction;


/**
 * Queries an entry for additional metadata.
 * @return {!goog.async.Deferred} A deferred fulfilled when the query completes.
 *     Successful callbacks receive a {@see gf.io.EntryMetadata}.
 */
gf.io.Entry.prototype.queryMetadata = goog.nullFunction;


/**
 * Removes a file or directory.
 * It is an error to remove a directory that is not empty or the root of the
 * filesystem.
 * @return {!goog.async.Deferred} A deferred fulfilled when the file has been
 *    removed from the file system.
 */
gf.io.Entry.prototype.remove = goog.nullFunction;


/**
 * Copies the entry to a new location.
 * @param {!gf.io.DirectoryEntry} parent New parent directory.
 * @param {string=} opt_newName New name of the entry, otherwise the current
 *     name will be used.
 * @return {!goog.async.Deferred} A deferred fulfilled when the copy has
 *     completed. A successful callback will receive the new entry as either a
 *     {@see gf.io.FileEntry} or {@see gf.io.DirectoryEntry}.
 */
gf.io.Entry.prototype.copyTo = goog.nullFunction;


/**
 * Moves the entry to a new location.
 * @param {!gf.io.DirectoryEntry} parent New parent directory.
 * @param {string=} opt_newName New name of the entry, otherwise the current
 *     name will be used.
 * @return {!goog.async.Deferred} A deferred fulfilled when the move has
 *     completed. A successful callback will receive the new entry as either a
 *     {@see gf.io.FileEntry} or {@see gf.io.DirectoryEntry}.
 */
gf.io.Entry.prototype.moveTo = goog.nullFunction;
