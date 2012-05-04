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

goog.provide('gf.io.html.HtmlFileWriter');

goog.require('gf.io.Error');
goog.require('gf.io.ErrorCode');
goog.require('gf.io.FileWriter');
goog.require('goog.Disposable');
goog.require('goog.async.Deferred');
goog.require('goog.events.EventHandler');
goog.require('goog.fs');
goog.require('goog.fs.FileSaver');



/**
 * HTML5 File System API implementation of a file writer.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @implements {gf.io.FileWriter}
 * @param {!goog.fs.FileWriter} writerImpl goog.fs file writer implementation.
 */
gf.io.html.HtmlFileWriter = function(writerImpl) {
  goog.base(this);

  /**
   * @private
   * @type {!goog.fs.FileWriter}
   */
  this.impl_ = writerImpl;
  this.registerDisposable(this.impl_);

  /**
   * A deferred that is waiting for a write operation to complete.
   * There can only be one pending operation at a time.
   * @private
   * @type {goog.async.Deferred}
   */
  this.waitingDeferred_ = null;

  /**
   * A string describing the action of the currently waiting deferred, for
   * error reporting.
   * @private
   * @type {string?}
   */
  this.waitingAction_ = null;

  /**
   * Event handler.
   * @private
   * @type {!goog.events.EventHandler}
   */
  this.eh_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eh_);

  this.eh_.listen(
      this.impl_,
      goog.fs.FileSaver.EventType.WRITE_END,
      function() {
        if (this.waitingDeferred_) {
          var deferred = this.waitingDeferred_;
          this.waitingDeferred_ = null;
          this.waitingAction_ = null;
          deferred.callback(null);
        }
      });
  this.eh_.listen(
      this.impl_,
      goog.fs.FileSaver.EventType.ERROR,
      function() {
        if (this.waitingDeferred_ && this.waitingAction_) {
          var deferred = this.waitingDeferred_;
          var err =
              new gf.io.Error(gf.io.ErrorCode.SECURITY, this.waitingAction_);
          this.waitingDeferred_ = null;
          this.waitingAction_ = null;
          deferred.errback(err);
        }
      });
  this.eh_.listen(
      this.impl_,
      goog.fs.FileSaver.EventType.ABORT,
      function() {
        if (this.waitingDeferred_ && this.waitingAction_) {
          var deferred = this.waitingDeferred_;
          var err =
              new gf.io.Error(gf.io.ErrorCode.ABORT, this.waitingAction_);
          this.waitingDeferred_ = null;
          this.waitingAction_ = null;
          deferred.errback(err);
        }
      });
};
goog.inherits(gf.io.html.HtmlFileWriter, goog.Disposable);


/**
 * @override
 */
gf.io.html.HtmlFileWriter.prototype.getLength = function() {
  return this.impl_.getLength();
};


/**
 * @override
 */
gf.io.html.HtmlFileWriter.prototype.setLength = function(value) {
  var deferred = new goog.async.Deferred();
  if (this.waitingDeferred_) {
    deferred.errback(new gf.io.Error(gf.io.ErrorCode.INVALID_STATE,
        'overlapped set length'));
  } else if (value == this.getLength()) {
    deferred.callback(null);
  } else {
    this.waitingDeferred_ = deferred;
    this.waitingAction_ = 'set length';
    this.impl_.truncate(value);
  }
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlFileWriter.prototype.write = function(offset, var_args) {
  var deferred = new goog.async.Deferred();
  if (this.waitingDeferred_) {
    deferred.errback(new gf.io.Error(gf.io.ErrorCode.INVALID_STATE,
        'overlapped write'));
    return deferred;
  }

  var args = Array.prototype.slice.call(arguments, 1);
  var blob = goog.fs.getBlob.apply(goog.global, args);

  if (offset > this.getLength()) {
    this.setLength(offset + blob.size).addCallbacks(
        function() {
          this.waitingDeferred_ = deferred;
          this.waitingAction_ = 'write';
          this.impl_.seek(offset);
          this.impl_.write(blob);
        },
        function(arg) {
          deferred.errback(arg);
        }, this);
  } else {
    this.waitingDeferred_ = deferred;
    this.waitingAction_ = 'write';
    this.impl_.seek(offset);
    this.impl_.write(blob);
  }
  return deferred;
};
