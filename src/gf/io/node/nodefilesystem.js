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

goog.provide('gf.io.node.NodeFileSystem');

goog.require('gf.io.Error');
goog.require('gf.io.ErrorCode');
goog.require('gf.io.FileSystem');
goog.require('gf.io.FileSystemType');
goog.require('gf.io.node');
goog.require('gf.io.node.NodeDirectoryEntry');
goog.require('gf.log');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.string');



/**
 * A file system implementation wrapping the node.js file APIs.
 * Node filesystems are always available and quota is ignored. Requests for
 * temporary file systems ensure that a new file system scope is created each
 * time one is requested.
 *
 * NOTE: currently the file system is not sandboxed and requests for files
 * outside of the sandbox will succeed.
 * TODO(benvanik): sandbox the filesystem
 *
 * @constructor
 * @extends {gf.io.FileSystem}
 * @param {string} rootPath Root path on the OS file system.
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 */
gf.io.node.NodeFileSystem = function(rootPath, type, size) {
  goog.base(this, type, size);

  /**
   * node.js path module.
   * @type {!PathModule}
   */
  this.pathModule = /** @type {!PathModule} */ (require('path'));

  /**
   * node.js fs module.
   * @type {!FsModule}
   */
  this.fsModule = /** @type {!FsModule} */ (require('fs'));

  /**
   * Root path on the OS file system.
   * @type {string}
   */
  this.rootPath = rootPath;

  /**
   * Root directory entry, if prepared.
   * @type {gf.io.DirectoryEntry}
   */
  this.root = null;
};
goog.inherits(gf.io.node.NodeFileSystem, gf.io.FileSystem);


/**
 * @override
 */
gf.io.node.NodeFileSystem.prototype.disposeInternal = function() {
  // Attempt to cleanly remove temporary filesystems on close
  // This may fail, or if we crashed it will never get called, but oh well
  if (this.type == gf.io.FileSystemType.TEMPORARY) {
    try {
      this.rmdirRecursiveSync(this.rootPath);
    } catch (e) {
      // TODO(benvanik): log error
      gf.log.write('unable to cleanup temporary fs', e);
    }
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Ensures that the given path, and all paths leading up to it, exist.
 * @param {string} targetPath Path.
 */
gf.io.node.NodeFileSystem.prototype.mkdirSync = function(targetPath) {
  var fs = this.fsModule;
  var path = this.pathModule;
  var parts = targetPath.split('/');
  var cwd = parts.shift(); // remove /
  for (var n = 0; n < parts.length; n++) {
    cwd = cwd + '/' + parts[n];
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd);
    }
  }
};


/**
 * Recursively removes a directory and all files, synchronously.
 * @param {string} path Path to remove.
 */
gf.io.node.NodeFileSystem.prototype.rmdirRecursiveSync = function(path) {
  var fs = this.fsModule;
  var files = fs.readdirSync(path);
  for (var n = 0; n < files.length; n++) {
    var filePath = path + '/' + files[n];
    var stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      this.rmdirRecursiveSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  }
  fs.rmdirSync(path);
};


/**
 * Prepares the file system for use.
 * @param {!goog.async.Deferred} deferred The deferred to signal when the file
 *     system is ready for use.
 */
gf.io.node.NodeFileSystem.prototype.prepare = function(deferred) {
  try {
    // If we are temporary, try to create a session-unique directory
    if (this.type == gf.io.FileSystemType.TEMPORARY) {
      while (true) {
        var rand = goog.string.getRandomString();
        var randRoot = this.rootPath + rand + '/';
        if (this.fsModule.existsSync(randRoot)) {
          continue;
        } else {
          this.rootPath = randRoot;
          break;
        }
      }
    }

    // Ensure the root path exists
    if (!this.fsModule.existsSync(this.rootPath)) {
      this.mkdirSync(this.rootPath);
    }

    // Get root entry
    this.root = new gf.io.node.NodeDirectoryEntry(this, this.rootPath);

    deferred.callback(this);
  } catch (e) {
    deferred.errback(gf.io.node.convertError(e, 'prepare fs'));
  }
};


/**
 * @override
 */
gf.io.node.NodeFileSystem.prototype.getRoot = function() {
  goog.asserts.assert(this.root);
  return this.root;
};


/**
 * Asynchronously requests quota from the system.
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 * @return {!goog.async.Deferred} A deferred fulfilled when the quota is
 *     available. Successful callbacks receive an adjusted quota amount that may
 *     be less than requested.
 */
gf.io.node.NodeFileSystem.requestQuota = function(type, size) {
  // TODO(benvanik): limit based on disk capacity?
  return goog.async.Deferred.succeed(size);
};


/**
 * Requests the creation of a new node.js file system implementation.
 * @param {gf.io.FileSystemType} type Requested type.
 * @param {number} size Maximum size, in bytes, of the requested file system.
 * @return {!goog.async.Deferred} A deferred fulfilled when the file system is
 *     ready for use.
 */
gf.io.node.NodeFileSystem.request = function(type, size) {
  var deferred = new goog.async.Deferred();

  var root = null;
  switch (type) {
    case gf.io.FileSystemType.TEMPORARY:
      root = gf.io.node.temporaryRoot;
      break;
    case gf.io.FileSystemType.PERSISTENT:
      root = gf.io.node.persistentRoot;
      break;
  }
  if (!root) {
    deferred.errback(new gf.io.Error(gf.io.ErrorCode.NOT_FOUND, 'create fs'));
    return deferred;
  }

  var fs = new gf.io.node.NodeFileSystem(root, type, size);
  fs.prepare(deferred);
  return deferred;
};
