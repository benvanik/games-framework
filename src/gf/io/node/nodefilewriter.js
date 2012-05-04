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

goog.provide('gf.io.node.NodeFileWriter');

goog.require('gf.io.Error');
goog.require('gf.io.ErrorCode');
goog.require('gf.io.FileWriter');
goog.require('gf.io.node');
goog.require('gf.util.node');
goog.require('goog.Disposable');
goog.require('goog.async.Deferred');



/**
 * A node.js implementation of a file writer.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @implements {gf.io.FileWriter}
 * @param {!gf.io.node.NodeFileSystem} fileSystem Owning file system.
 * @param {string} fullPath Full path.
 * @param {Object} fd File descriptor.
 */
gf.io.node.NodeFileWriter = function(fileSystem, fullPath, fd) {
  goog.base(this);

  /**
   * Node FS module.
   * @private
   * @type {!FsModule}
   */
  this.fs_ = fileSystem.fsModule;

  /**
   * File handle. Must be closed.
   * @private
   * @type {Object}
   */
  this.fd_ = fd;

  /**
   * Whether a write is in progress.
   * @private
   * @type {boolean}
   */
  this.writing_ = false;
};
goog.inherits(gf.io.node.NodeFileWriter, goog.Disposable);


/**
 * @override
 */
gf.io.node.NodeFileWriter.prototype.getLength = function() {
  var fs = this.fs_;
  try {
    var stats = fs.fstatSync(this.fd_);
    return stats.size;
  } catch (e) {
    // TODO(benvanik): error handling?
    return 0;
  }
};


/**
 * @override
 */
gf.io.node.NodeFileWriter.prototype.setLength = function(value) {
  var fs = this.fs_;
  var deferred = new goog.async.Deferred();
  if (this.writing_) {
    deferred.errback(new gf.io.Error(gf.io.ErrorCode.INVALID_STATE,
        'overlapped set length'));
  } else if (value == this.getLength()) {
    deferred.callback(null);
  } else {
    this.writing_ = true;
    fs.truncate(this.fd_, value,
        goog.bind(function(err) {
          this.writing_ = false;
          if (!err) {
            deferred.callback(null);
          } else {
            deferred.errback(gf.io.node.convertError(err, 'set length'));
          }
        }, this));
  }
  return deferred;
};


/**
 * @override
 */
gf.io.node.NodeFileWriter.prototype.write = function(offset, var_args) {
  var fs = this.fs_;
  var deferred = new goog.async.Deferred();
  if (this.writing_) {
    deferred.errback(new gf.io.Error(gf.io.ErrorCode.INVALID_STATE,
        'overlapped write'));
    return deferred;
  }

  var args = Array.prototype.slice.call(arguments, 1);
  var buffer = gf.util.node.arrayBuffersToBuffer(args);

  this.writing_ = true;

  fs.write(this.fd_, buffer, 0, buffer.length, offset,
      goog.bind(function(err, written, buffer) {
        this.writing_ = false;
        if (!err) {
          deferred.callback(null);
        } else {
          deferred.errback(gf.io.node.convertError(err, 'write'));
        }
      }, this));

  return deferred;
};
