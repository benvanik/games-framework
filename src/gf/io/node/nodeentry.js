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

goog.provide('gf.io.node.NodeDirectoryEntry');
goog.provide('gf.io.node.NodeEntry');
goog.provide('gf.io.node.NodeFileEntry');

goog.require('gf.io.DirectoryEntry');
goog.require('gf.io.Entry');
goog.require('gf.io.EntryMetadata');
goog.require('gf.io.Error');
goog.require('gf.io.ErrorCode');
goog.require('gf.io.FileEntry');
goog.require('gf.io.node');
goog.require('gf.io.node.NodeFileReader');
goog.require('gf.io.node.NodeFileWriter');
goog.require('gf.util.node');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.functions');



/**
 * A node.js entry base type.
 *
 * @constructor
 * @implements {gf.io.Entry}
 * @param {!gf.io.node.NodeFileSystem} fileSystem Owning file system.
 * @param {string} fullPath Full path.
 * @param {gf.io.Entry.Type} type Entry type.
 */
gf.io.node.NodeEntry = function(fileSystem, fullPath, type) {
  /**
   * The file system that this entry is from.
   * @type {!gf.io.node.NodeFileSystem}
   */
  this.fileSystem = fileSystem;

  /**
   * The full path of the entry in the file system.
   * @type {string}
   */
  this.fullPath = fullPath;

  /**
   * The name of the entry.
   * @type {string}
   */
  this.name = fileSystem.pathModule.basename(fullPath);

  /**
   * Type of the entry.
   * @type {gf.io.Entry.Type}
   */
  this.type = type;
};


/**
 * @override
 */
gf.io.node.NodeEntry.prototype.isFile = function() {
  return this.type == gf.io.Entry.Type.FILE;
};


/**
 * @override
 */
gf.io.node.NodeEntry.prototype.isDirectory = function() {
  return this.type == gf.io.Entry.Type.DIRECTORY;
};


/**
 * @override
 */
gf.io.node.NodeEntry.prototype.queryParentEntry = function() {
  var path = this.fileSystem.pathModule;
  var deferred = new goog.async.Deferred();
  var parentPath = path.dirname(this.fullPath);
  deferred.callback(
      new gf.io.node.NodeDirectoryEntry(this.fileSystem, parentPath));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeEntry.prototype.queryMetadata = function() {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  fs.lstat(this.fullPath,
      goog.bind(function(err, stats) {
        if (!err) {
          var metadata = new gf.io.EntryMetadata();
          metadata.modificationTime = stats.mtime.getTime();
          deferred.callback(metadata);
        } else {
          deferred.errback(gf.io.node.convertError(err,
              'query metadata ' + this.fullPath));
        }
      }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeEntry.prototype.remove = function() {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  switch (this.type) {
    case gf.io.Entry.Type.FILE:
      fs.unlink(this.fullPath,
          goog.bind(function(err) {
            if (!err) {
              deferred.callback(null);
            } else {
              deferred.errback(gf.io.node.convertError(err,
                  'remove ' + this.fullPath));
            }
          }, this));
      break;
    case gf.io.Entry.Type.DIRECTORY:
      fs.rmdir(this.fullPath,
          goog.bind(function(err) {
            if (!err) {
              deferred.callback(null);
            } else {
              deferred.errback(gf.io.node.convertError(err,
                  'remove ' + this.fullPath));
            }
          }, this));
      break;
    default:
      deferred.callback(null);
      break;
  }
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeEntry.prototype.copyTo = function(parent, opt_newName) {
  goog.asserts.fail('not yet implemented');
  var deferred = new goog.async.Deferred();
  // var parentImpl =
  //     /** @type {!gf.io.node.NodeDirectoryEntry} */ (parent).dirImpl_;
  // this.impl_.copyTo(parentImpl, opt_newName).addCallbacks(
  //     function(newImpl) {
  //       deferred.callback(this.wrapImpl(newImpl));
  //     },
  //     function(arg) {
  //       deferred.errback(
  //           gf.io.node.convertError(arg,
  //               'copy ' + this.fullPath + ' to ' + parent.fullPath +
  //               (opt_newName ? ' new name ' + opt_newName : '')));
  //     }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeEntry.prototype.moveTo = function(parent, opt_newName) {
  goog.asserts.fail('not yet implemented');
  var deferred = new goog.async.Deferred();
  // var parentImpl =
  //     /** @type {!gf.io.node.NodeDirectoryEntry} */ (parent).dirImpl_;
  // this.impl_.moveTo(parentImpl, opt_newName).addCallbacks(
  //     function(newImpl) {
  //       deferred.callback(this.wrapImpl(newImpl));
  //     },
  //     function(arg) {
  //       deferred.errback(
  //           gf.io.node.convertError(arg,
  //               'move ' + this.fullPath + ' to ' + parent.fullPath +
  //               (opt_newName ? ' new name ' + opt_newName : '')));
  //     }, this);
  return deferred;
};



/**
 * A node.js file entry.
 *
 * @constructor
 * @extends {gf.io.node.NodeEntry}
 * @implements {gf.io.FileEntry}
 * @param {!gf.io.node.NodeFileSystem} fileSystem Owning file system.
 * @param {string} fullPath Full path.
 */
gf.io.node.NodeFileEntry = function(fileSystem, fullPath) {
  goog.base(this, fileSystem, fullPath, gf.io.Entry.Type.FILE);
};
goog.inherits(gf.io.node.NodeFileEntry, gf.io.node.NodeEntry);


/**
 * @override
 */
gf.io.node.NodeFileEntry.prototype.createReader = function() {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  fs.open(this.fullPath, 'r', undefined,
      goog.bind(function(err, fd) {
        if (!err) {
          deferred.callback(new gf.io.node.NodeFileReader(
              this.fileSystem, this.fullPath, fd));
        } else {
          deferred.errback(gf.io.node.convertError(err,
              'create writer ' + this.fullPath));
        }
      }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeFileEntry.prototype.createWriter = function() {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  fs.open(this.fullPath, 'r+', undefined,
      goog.bind(function(err, fd) {
        if (!err) {
          deferred.callback(new gf.io.node.NodeFileWriter(
              this.fileSystem, this.fullPath, fd));
        } else {
          deferred.errback(gf.io.node.convertError(err,
              'create writer ' + this.fullPath));
        }
      }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeFileEntry.prototype.read = function() {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  fs.readFile(this.fullPath, goog.bind(function(err, data) {
    if (!err) {
      deferred.callback(gf.util.node.bufferToArrayBuffer(data));
    } else {
      deferred.errback(gf.io.node.convertError(err,
          'read data ' + this.fullPath));
    }
  }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeFileEntry.prototype.write = function(data) {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  var buffer = gf.util.node.arrayBufferToBuffer(data);
  fs.writeFile(this.fullPath, buffer, goog.bind(function(err) {
    if (!err) {
      deferred.callback(null);
    } else {
      deferred.errback(gf.io.node.convertError(err,
          'write data ' + this.fullPath));
    }
  }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeFileEntry.prototype.append = function(data) {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();

  var stream = fs.createWriteStream(this.fullPath, {
    'flags': 'a'
  });
  stream.addListener('close', goog.bind(function() {
    deferred.callback(null);
  }, this));
  stream.addListener('error', goog.bind(function(err) {
    deferred.errback(gf.io.node.convertError(err,
        'append data write ' + this.fullPath));
  }, this));

  var buffer = gf.util.node.arrayBufferToBuffer(data);
  stream.end(buffer);
  stream.destroySoon();

  return deferred;
};



/**
 * A node.js directory entry.
 *
 * @constructor
 * @extends {gf.io.node.NodeEntry}
 * @implements {gf.io.DirectoryEntry}
 * @param {!gf.io.node.NodeFileSystem} fileSystem Owning file system.
 * @param {string} fullPath Full path.
 */
gf.io.node.NodeDirectoryEntry = function(fileSystem, fullPath) {
  goog.base(this, fileSystem, fullPath, gf.io.Entry.Type.DIRECTORY);
};
goog.inherits(gf.io.node.NodeDirectoryEntry, gf.io.node.NodeEntry);


/**
 * Touches a file on the file system to ensure it exists.
 * @private
 * @param {string} path Full file path.
 * @param {!goog.async.Deferred} deferred A deferred to signal when the file has
 *     been created.
 */
gf.io.node.NodeDirectoryEntry.prototype.touchFile_ = function(path, deferred) {
  var fs = this.fileSystem.fsModule;
  fs.open(path, 'a', undefined,
      goog.bind(function(err, fd) {
        if (!err) {
          fs.close(fd,
              goog.bind(function(err) {
                // NOTE: ignoring the error here, as it doesn't matter
                deferred.callback(new gf.io.node.NodeFileEntry(
                    this.fileSystem, path));
              }, this));
        } else {
          deferred.errback(gf.io.node.convertError(err,
              'touch ' + path));
        }
      }, this));
};


/**
 * @override
 */
gf.io.node.NodeDirectoryEntry.prototype.getFile = function(path,
    opt_behavior) {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  var fullPath = this.fullPath + '/' + path;
  fs.lstat(fullPath,
      goog.bind(function(err, stats) {
        if (!err) {
          switch (opt_behavior) {
            case gf.io.DirectoryEntry.Behavior.CREATE_EXCLUSIVE:
              // Expected not to exist, fail
              deferred.errback(new gf.io.Error(
                  gf.io.ErrorCode.PATH_EXISTS,
                  'get file ' + path + ' in ' + this.fullPath));
              break;
            default:
              // Exists
              if (!stats.isFile()) {
                deferred.errback(new gf.io.Error(
                    gf.io.ErrorCode.TYPE_MISMATCH,
                    'get file ' + path + ' in ' + this.fullPath));
              } else {
                deferred.callback(new gf.io.node.NodeFileEntry(
                    this.fileSystem, fullPath));
              }
              break;
          }
        } else {
          // Likely does not exist - create if needed
          switch (opt_behavior) {
            case gf.io.DirectoryEntry.Behavior.CREATE:
            case gf.io.DirectoryEntry.Behavior.CREATE_EXCLUSIVE:
              this.touchFile_(fullPath, deferred);
              break;
            default:
              deferred.errback(gf.io.node.convertError(err,
                  'get file ' + path + ' in ' + this.fullPath));
              break;
          }
        }
      }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeDirectoryEntry.prototype.getDirectory = function(path,
    opt_behavior) {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  var fullPath = this.fullPath + '/' + path;
  fs.lstat(fullPath,
      goog.bind(function(err, stats) {
        if (!err) {
          switch (opt_behavior) {
            case gf.io.DirectoryEntry.Behavior.CREATE_EXCLUSIVE:
              // Expected not to exist, fail
              deferred.errback(new gf.io.Error(
                  gf.io.ErrorCode.PATH_EXISTS,
                  'get directory ' + path + ' in ' + this.fullPath));
              break;
            default:
              // Exists
              if (!stats.isDirectory()) {
                deferred.errback(new gf.io.Error(
                    gf.io.ErrorCode.TYPE_MISMATCH,
                    'get directory ' + path + ' in ' + this.fullPath));
              } else {
                deferred.callback(new gf.io.node.NodeDirectoryEntry(
                    this.fileSystem, fullPath));
              }
              break;
          }
        } else {
          // Likely does not exist - create if needed
          switch (opt_behavior) {
            case gf.io.DirectoryEntry.Behavior.CREATE:
            case gf.io.DirectoryEntry.Behavior.CREATE_EXCLUSIVE:
              fs.mkdir(fullPath,
                  goog.bind(function(err) {
                    if (!err) {
                      deferred.callback(new gf.io.node.NodeDirectoryEntry(
                          this.fileSystem, fullPath));
                    } else {
                      deferred.errback(gf.io.node.convertError(err,
                          'get directory ' + path + ' in ' + this.fullPath));
                    }
                  }, this));
              break;
            default:
              deferred.errback(gf.io.node.convertError(err,
                  'get directory ' + path + ' in ' + this.fullPath));
              break;
          }
        }
      }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeDirectoryEntry.prototype.createPath = function(path) {
  // Laregely borrowed from goog.fs.DirectoryEntry#createPath

  // Filter out any empty path components caused by '//' or a leading slash.
  var parts = goog.array.filter(path.split('/'), goog.functions.identity);
  var existed = [];

  function getNextDirectory(dir) {
    if (!parts.length) {
      return goog.async.Deferred.succeed(dir);
    }
    var def;
    var nextDir = parts.shift();
    if (nextDir == '..') {
      def = dir.getParent();
    } else if (nextDir == '.') {
      def = goog.async.Deferred.succeed(dir);
    } else {
      def = dir.getDirectory(nextDir, gf.io.DirectoryEntry.Behavior.CREATE);
    }
    return def.addCallback(getNextDirectory);
  }

  return getNextDirectory(this);
};


/**
 * @override
 */
gf.io.node.NodeDirectoryEntry.prototype.listDirectory = function() {
  var fs = this.fileSystem.fsModule;
  var deferred = new goog.async.Deferred();
  fs.readdir(this.fullPath,
      goog.bind(function(err, files) {
        if (!err) {
          var entries = new Array(files.length);
          try {
            for (var n = 0; n < files.length; n++) {
              var path = this.fullPath + '/' + files[n];
              var stats = fs.lstatSync(path);
              if (stats.isFile()) {
                entries[n] = new gf.io.node.NodeFileEntry(
                    this.fileSystem, path);
              } else {
                entries[n] = new gf.io.node.NodeDirectoryEntry(
                    this.fileSystem, path);
              }
            }
            deferred.callback(entries);
          } catch (e) {
            err = e;
          }
        }
        if (err) {
          deferred.errback(gf.io.node.convertError(err,
              'list ' + this.fullPath));
        }
      }, this));
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeDirectoryEntry.prototype.removeRecursively = function() {
  var deferred = new goog.async.Deferred();
  try {
    this.fileSystem.rmdirRecursiveSync(this.fullPath);
    deferred.callback(null);
  } catch (e) {
    deferred.errback(gf.io.node.convertError(e,
        'remove recursively ' + this.fullPath));
  }
  return deferred;
};
