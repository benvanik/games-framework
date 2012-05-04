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
 * @fileoverview IO accessors and abstraction layer.
 * All IO systems should be created via the methods in this namespace to ensure
 * compatibility across targets.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.io');

goog.require('gf');
goog.require('gf.io.html.HtmlFileSystem');
goog.require('gf.io.node.NodeFileSystem');


/**
 * Asynchronously requests quota from the system.
 * This must be called before a persistent file system can be created, and may
 * fail.
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 * @return {!goog.async.Deferred} A deferred fulfilled when the quota is
 *     available. Successful callbacks receive an adjusted quota amount that may
 *     be less than requested.
 */
gf.io.requestQuota = function(type, size) {
  if (gf.NODE) {
    // Node.js
    return gf.io.node.NodeFileSystem.requestQuota(type, size);
  } else {
    // HTML
    return gf.io.html.HtmlFileSystem.requestQuota(type, size);
  }
};


/**
 * Asynchronously requests a file system of the given type.
 * The request may fail if the user denies it or quota is not available.
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 * @return {!goog.async.Deferred} A deferred fulfilled when the file system is
 *     ready for use. If the user denies the request or no supported file
 *     systems are available then an error will be called back. Successful
 *     callbacks receive the filesystem as their only argument.
 */
gf.io.requestFileSystem = function(type, size) {
  if (gf.NODE) {
    // Node.js
    return gf.io.node.NodeFileSystem.request(type, size);
  } else {
    // HTML
    return gf.io.html.HtmlFileSystem.request(type, size);
  }
};


// TODO(benvanik): inflate/deflate
