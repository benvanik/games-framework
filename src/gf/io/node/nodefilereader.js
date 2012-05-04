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

goog.provide('gf.io.node.NodeFileReader');

goog.require('gf.io.Error');
goog.require('gf.io.ErrorCode');
goog.require('gf.io.FileReader');
goog.require('gf.io.node');
goog.require('goog.Disposable');
goog.require('goog.async.Deferred');



/**
 * A node.js implementation of a file reader.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @implements {gf.io.FileReader}
 * @param {!gf.io.node.NodeFileSystem} fileSystem Owning file system.
 * @param {string} fullPath Full path.
 * @param {Object} fd File descriptor.
 */
gf.io.node.NodeFileReader = function(fileSystem, fullPath, fd) {
  goog.base(this);

  /**
   * Node FS module.
   * @private
   * @type {!FsModule}
   */
  this.fs_ = fileSystem.fsModule;

  /**
   * Full path of the file.
   * @private
   * @type {string}
   */
  this.fullPath_ = fullPath;

  /**
   * File handle. Must be closed.
   * @private
   * @type {Object}
   */
  this.fd_ = fd;

  /**
   * File size at the time the file was opened.
   * @private
   * @type {number}
   */
  this.size_ = this.fs_.fstatSync(this.fd_).size;
};
goog.inherits(gf.io.node.NodeFileReader, goog.Disposable);


/**
 * @override
 */
gf.io.node.NodeFileReader.prototype.disposeInternal = function() {
  var fs = this.fs_;
  fs.closeSync(this.fd_);
  this.fd_ = null;

  goog.base(this, 'disposeInternal');
};


/**
 * @override
 */
gf.io.node.NodeFileReader.prototype.getLength = function() {
  return this.size_;
};


/**
 * @override
 */
gf.io.node.NodeFileReader.prototype.read = function(
    opt_offset, opt_size, opt_value) {
  var length = this.getLength();
  var start = opt_offset || 0;
  if (start >= length) {
    var deferred = new goog.async.Deferred();
    deferred.errback(
        new gf.io.Error(gf.io.ErrorCode.INVALID_STATE, 'read file'));
    return deferred;
  }
  var end = start + (goog.isDef(opt_size) ? opt_size : length);
  if (end > length) {
    end = length;
  }
  end = end || 0;

  // TODO(benvanik): pool buffers (static pool on type?)
  var buffer = new Buffer(end - start);

  var deferred = new goog.async.Deferred();
  this.fs_.read(this.fd_, buffer, 0, end - start, start,
      goog.bind(function(err, bytesRead, buffer) {
        if (!err) {
          var targetBuffer = null;
          var targetBytes = null;
          if (opt_value && opt_value.byteLength == bytesRead) {
            targetBuffer = opt_value;
            targetBytes = new Uint8Array(targetBuffer);
          } else {
            targetBytes = new Uint8Array(end - start);
            targetBuffer = targetBytes.buffer;
          }
          for (var n = 0; n < targetBytes.length; n++) {
            targetBytes[n] = buffer[n];
          }
          deferred.callback(targetBuffer);
        } else {
          deferred.errback(gf.io.node.convertError(err,
              'read ' + this.fullPath_));
        }
      }, this));
  return deferred;
};
