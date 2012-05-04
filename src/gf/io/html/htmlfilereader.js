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

goog.provide('gf.io.html.HtmlFileReader');

goog.require('gf.io.Error');
goog.require('gf.io.ErrorCode');
goog.require('gf.io.FileReader');
goog.require('gf.io.html');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.events.EventHandler');
goog.require('goog.fs.FileReader');
goog.require('goog.structs.SimplePool');



/**
 * HTML5 File System API implementation of a file reader.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @implements {gf.io.FileReader}
 * @param {!Blob} blob File blob.
 */
gf.io.html.HtmlFileReader = function(blob) {
  goog.base(this);

  /**
   * Main (unsliced) file blob.
   * @private
   * @type {!Blob}
   */
  this.blob_ = blob;

  /**
   * Pool of {@see gf.io.html.HtmlFileReader.ReadRequest_} instances.
   * @private
   * @type {!goog.structs.SimplePool}
   */
  this.pool_ = new goog.structs.SimplePool(0, 5);
  this.registerDisposable(this.pool_);
  this.pool_.setCreateObjectFn(goog.bind(function() {
    return new gf.io.html.HtmlFileReader.ReadRequest_(this.pool_);
  }, this));
};
goog.inherits(gf.io.html.HtmlFileReader, goog.Disposable);


/**
 * @override
 */
gf.io.html.HtmlFileReader.prototype.getLength = function() {
  return this.blob_.size;
};


/**
 * @override
 */
gf.io.html.HtmlFileReader.prototype.read = function(
    opt_offset, opt_size, opt_value) {
  var length = this.blob_.size;
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

  var blob = null;
  if (start == 0 && end == length) {
    // Use whole blob
    blob = this.blob_;
  } else {
    // Slice blob
    if (this.blob_.slice) {
      blob = this.blob_.slice(start, end);
    } else if (this.blob_.webkitSlice) {
      blob = this.blob_.webkitSlice(start, end);
    }
  }
  goog.asserts.assert(blob);

  // NOTE: we never use the given array buffer, as the API doesn't support
  // writing into an existing buffer

  var request = /** @type {!gf.io.html.HtmlFileReader.ReadRequest_} */ (
      this.pool_.getObject());
  return request.begin(blob);
};



/**
 * A read request operation.
 * Meant to be pooled to prevent many allocations.
 *
 * @private
 * @constructor
 * @extends {goog.events.EventHandler}
 * @param {!goog.structs.SimplePool} pool The pool this request should be
 *     returned to.
 */
gf.io.html.HtmlFileReader.ReadRequest_ = function(pool) {
  goog.base(this, this);

  /**
   * The pool this request should be returned to.
   * @private
   * @type {!goog.structs.SimplePool}
   */
  this.pool_ = pool;

  /**
   * A deferred for the current read operation.
   * @private
   * @type {goog.async.Deferred}
   */
  this.deferred_ = null;

  /**
   * @private
   * @type {!goog.fs.FileReader}
   */
  this.reader_ = new goog.fs.FileReader();
  this.registerDisposable(this.reader_);

  this.listen(
      this.reader_,
      goog.fs.FileReader.EventType.LOAD_END,
      this.complete_);
};
goog.inherits(gf.io.html.HtmlFileReader.ReadRequest_, goog.events.EventHandler);


/**
 * Begins reading the blob.
 * @param {!Blob} blob Blob to read.
 * @return {!goog.async.Deferred} A deferred that is fulfilled when the read
 *     completes. Can be cancelled. Successful callbacks receive an ArrayBuffer.
 */
gf.io.html.HtmlFileReader.ReadRequest_.prototype.begin = function(blob) {
  var deferred = new goog.async.Deferred(this.cancel_, this);
  this.deferred_ = deferred;
  this.reader_.readAsArrayBuffer(blob);
  return deferred;
};


/**
 * Handles deferred cancel requests and aborts the read.
 * @private
 */
gf.io.html.HtmlFileReader.ReadRequest_.prototype.cancel_ = function() {
  this.reader_.abort();
};


/**
 * Returns the request to the pool.
 * @private
 */
gf.io.html.HtmlFileReader.ReadRequest_.prototype.complete_ = function() {
  var deferred = this.deferred_;
  if (!deferred) {
    return;
  }
  this.deferred_ = null;

  var result = this.reader_.getResult();
  var error = this.reader_.getError();

  // Release now in case the callback needs another reader
  this.pool_.releaseObject(this);

  if (result) {
    deferred.callback(/** @type {!ArrayBuffer} */ (result));
  } else {
    deferred.errback(gf.io.html.convertError(error, 'read'));
  }
};
