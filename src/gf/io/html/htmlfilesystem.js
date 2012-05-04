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

goog.provide('gf.io.html.HtmlFileSystem');

goog.require('gf');
goog.require('gf.io.FileSystem');
goog.require('gf.io.FileSystemType');
goog.require('gf.io.html');
goog.require('gf.io.html.HtmlDirectoryEntry');
goog.require('goog.async.Deferred');
goog.require('goog.fs');



/**
 * A file system implementation wrapping the HTML5 file system API.
 * http://dev.w3.org/2009/dap/file-system/file-dir-sys.html
 * The HTML5 file system API works on quotas, and the user must allow the file
 * system to exist before it can be used. Temporary file systems have a better
 * success of being created.
 *
 * @constructor
 * @extends {gf.io.FileSystem}
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 * @param {!goog.fs.FileSystem} fs HTML file system wrapper.
 */
gf.io.html.HtmlFileSystem = function(type, size, fs) {
  goog.base(this, type, size);

  /**
   * Underlying HTML file system implementation.
   * @type {!goog.fs.FileSystem}
   */
  this.impl = fs;
};
goog.inherits(gf.io.html.HtmlFileSystem, gf.io.FileSystem);


/**
 * @override
 */
gf.io.html.HtmlFileSystem.prototype.getRoot = function() {
  return new gf.io.html.HtmlDirectoryEntry(this, this.impl.getRoot());
};


/**
 * Asynchronously requests quota from the system.
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 * @return {!goog.async.Deferred} A deferred fulfilled when the quota is
 *     available. Successful callbacks receive an adjusted quota amount that may
 *     be less than requested.
 */
gf.io.html.HtmlFileSystem.requestQuota = function(type, size) {
  var deferred = new goog.async.Deferred();

  if (gf.SERVER) {
    // Not available on workers
    deferred.errback(null);
  } else {
    // Check support
    if (!goog.global['webkitStorageInfo']) {
      deferred.errback(null);
    } else {
      goog.global['webkitStorageInfo']['requestQuota'](type, size,
          function(grantedBytes) {
            deferred.callback(grantedBytes);
          },
          function(e) {
            deferred.errback(e);
          });
    }
  }

  return deferred;
};


/**
 * Requests the creation of a new node.js file system implementation.
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 * @return {!goog.async.Deferred} A deferred fulfilled when the file system is
 *     ready for use.
 */
gf.io.html.HtmlFileSystem.request = function(type, size) {
  var deferred = new goog.async.Deferred();

  var getDeferred = null;
  switch (type) {
    case gf.io.FileSystemType.TEMPORARY:
      getDeferred = goog.fs.getTemporary(size);
      break;
    case gf.io.FileSystemType.PERSISTENT:
      getDeferred = goog.fs.getPersistent(size);
      break;
  }
  if (getDeferred) {
    getDeferred.addCallbacks(
        function(fs) {
          deferred.callback(new gf.io.html.HtmlFileSystem(type, size, fs));
        },
        function(arg) {
          deferred.errback(
              gf.io.html.convertError(arg, 'requesting filesystem'));
        });
  } else {
    deferred.errback(null);
  }

  return deferred;
};
