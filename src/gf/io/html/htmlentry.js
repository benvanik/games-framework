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

goog.provide('gf.io.html.HtmlDirectoryEntry');
goog.provide('gf.io.html.HtmlEntry');
goog.provide('gf.io.html.HtmlFileEntry');

goog.require('gf.io.DirectoryEntry');
goog.require('gf.io.Entry');
goog.require('gf.io.EntryMetadata');
goog.require('gf.io.FileEntry');
goog.require('gf.io.html');
goog.require('gf.io.html.HtmlFileReader');
goog.require('gf.io.html.HtmlFileWriter');
goog.require('goog.array');
goog.require('goog.async.Deferred');



/**
 * An HTML5 File API entry base type.
 *
 * @constructor
 * @implements {gf.io.Entry}
 * @param {!gf.io.FileSystem} fileSystem Owning file system.
 * @param {!goog.fs.Entry} entryImpl Entry implementation.
 */
gf.io.html.HtmlEntry = function(fileSystem, entryImpl) {
  /**
   * The file system that this entry is from.
   * @type {!gf.io.FileSystem}
   */
  this.fileSystem = fileSystem;

  /**
   * The full path of the entry in the file system.
   * @type {string}
   */
  this.fullPath = entryImpl.getFullPath();

  /**
   * The name of the entry.
   * @type {string}
   */
  this.name = entryImpl.getName();

  /**
   * Type of the entry.
   * @type {gf.io.Entry.Type}
   */
  this.type =
      entryImpl.isFile() ? gf.io.Entry.Type.FILE : gf.io.Entry.Type.DIRECTORY;

  /**
   * @private
   * @type {!goog.fs.Entry}
   */
  this.impl_ = entryImpl;
};


/**
 * @override
 */
gf.io.html.HtmlEntry.prototype.isFile = function() {
  return this.type == gf.io.Entry.Type.FILE;
};


/**
 * @override
 */
gf.io.html.HtmlEntry.prototype.isDirectory = function() {
  return this.type == gf.io.Entry.Type.DIRECTORY;
};


/**
 * @override
 */
gf.io.html.HtmlEntry.prototype.queryParentEntry = function() {
  var deferred = new goog.async.Deferred();
  this.impl_.getParent().addCallbacks(
      function(parent) {
        deferred.callback(
            new gf.io.html.HtmlDirectoryEntry(this.fileSystem, parent));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'query parent ' + this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlEntry.prototype.queryMetadata = function() {
  var deferred = new goog.async.Deferred();
  this.impl_.getLastModified().addCallbacks(
      function(lastModified) {
        var metadata = new gf.io.EntryMetadata();
        metadata.modificationTime = lastModified;
        deferred.callback(metadata);
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'query metadata ' + this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlEntry.prototype.remove = function() {
  var deferred = new goog.async.Deferred();
  this.impl_.remove().addCallbacks(
      function() {
        deferred.callback(null);
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'remove ' + this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlEntry.prototype.copyTo = function(parent, opt_newName) {
  var deferred = new goog.async.Deferred();
  var parentImpl =
      /** @type {!gf.io.html.HtmlDirectoryEntry} */ (parent).dirImpl_;
  this.impl_.copyTo(parentImpl, opt_newName).addCallbacks(
      function(newImpl) {
        deferred.callback(this.wrapImpl(newImpl));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg,
                'copy ' + this.fullPath + ' to ' + parent.fullPath +
                (opt_newName ? ' new name ' + opt_newName : '')));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlEntry.prototype.moveTo = function(parent, opt_newName) {
  var deferred = new goog.async.Deferred();
  var parentImpl =
      /** @type {!gf.io.html.HtmlDirectoryEntry} */ (parent).dirImpl_;
  this.impl_.moveTo(parentImpl, opt_newName).addCallbacks(
      function(newImpl) {
        deferred.callback(this.wrapImpl(newImpl));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg,
                'move ' + this.fullPath + ' to ' + parent.fullPath +
                (opt_newName ? ' new name ' + opt_newName : '')));
      }, this);
  return deferred;
};


/**
 * Wraps a goog.fs entry in a gf.io entry.
 * @protected
 * @param {!goog.fs.Entry} impl Underlying goog.fs handle.
 * @return {!gf.io.html.HtmlEntry} Wrapped entry.
 */
gf.io.html.HtmlEntry.prototype.wrapImpl = function(impl) {
  return impl.isFile() ?
      new gf.io.html.HtmlFileEntry(this.fileSystem,
          /** @type {!goog.fs.FileEntry} */ (impl)) :
      new gf.io.html.HtmlDirectoryEntry(this.fileSystem,
          /** @type {!goog.fs.DirectoryEntry} */ (impl));
};



/**
 * An HTML5 File API file entry.
 *
 * @constructor
 * @extends {gf.io.html.HtmlEntry}
 * @implements {gf.io.FileEntry}
 * @param {!gf.io.FileSystem} fileSystem Owning file system.
 * @param {!goog.fs.FileEntry} entryImpl Entry implementation.
 */
gf.io.html.HtmlFileEntry = function(fileSystem, entryImpl) {
  goog.base(this, fileSystem, entryImpl);

  /**
   * @private
   * @type {!goog.fs.FileEntry}
   */
  this.fileImpl_ = entryImpl;
};
goog.inherits(gf.io.html.HtmlFileEntry, gf.io.html.HtmlEntry);


/**
 * @override
 */
gf.io.html.HtmlFileEntry.prototype.createReader = function() {
  var deferred = new goog.async.Deferred();
  this.fileImpl_.file().addCallbacks(
      function(blob) {
        deferred.callback(new gf.io.html.HtmlFileReader(blob));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'create reader ' + this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlFileEntry.prototype.createWriter = function() {
  var deferred = new goog.async.Deferred();
  this.fileImpl_.createWriter().addCallbacks(
      function(writerImpl) {
        deferred.callback(new gf.io.html.HtmlFileWriter(writerImpl));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'create writer ' + this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlFileEntry.prototype.read = function() {
  var deferred = new goog.async.Deferred();
  this.createReader().addCallbacks(
      function(reader) {
        reader.read().addCallbacks(
            function(data) {
              goog.dispose(reader);
              deferred.callback(data);
            },
            function(arg) {
              goog.dispose(reader);
              deferred.errback(arg);
            });
      },
      function(arg) {
        deferred.errback(arg);
      });
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlFileEntry.prototype.write = function(data) {
  var deferred = new goog.async.Deferred();
  this.createWriter().addCallbacks(
      function(writer) {
        writer.setLength(0).addCallbacks(
            function() {
              writer.write(data).addCallbacks(
                  function() {
                    goog.dispose(writer);
                    deferred.callback(null);
                  },
                  function(arg) {
                    goog.dispose(writer);
                    deferred.errback(arg);
                  });
            },
            function(arg) {
              goog.dispose(writer);
              deferred.errback(arg);
            });
      },
      function(arg) {
        deferred.errback(arg);
      });
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlFileEntry.prototype.append = function(data) {
  var deferred = new goog.async.Deferred();
  this.createWriter().addCallbacks(
      function(writer) {
        writer.write(writer.getLength(), data).addCallbacks(
            function() {
              goog.dispose(writer);
              deferred.callback(null);
            },
            function(arg) {
              goog.dispose(writer);
              deferred.errback(arg);
            });
      },
      function(arg) {
        deferred.errback(arg);
      });
  return deferred;
};



/**
 * An HTML5 File API directory entry.
 *
 * @constructor
 * @extends {gf.io.html.HtmlEntry}
 * @implements {gf.io.DirectoryEntry}
 * @param {!gf.io.FileSystem} fileSystem Owning file system.
 * @param {!goog.fs.DirectoryEntry} entryImpl Entry implementation.
 */
gf.io.html.HtmlDirectoryEntry = function(fileSystem, entryImpl) {
  goog.base(this, fileSystem, entryImpl);

  /**
   * @private
   * @type {!goog.fs.DirectoryEntry}
   */
  this.dirImpl_ = entryImpl;
};
goog.inherits(gf.io.html.HtmlDirectoryEntry, gf.io.html.HtmlEntry);


/**
 * @override
 */
gf.io.html.HtmlDirectoryEntry.prototype.getFile = function(path,
    opt_behavior) {
  var implBehavior = /** @type {goog.fs.DirectoryEntry.Behavior|undefined} */ (
      opt_behavior);
  var deferred = new goog.async.Deferred();
  this.dirImpl_.getFile(path, implBehavior).addCallbacks(
      function(entryImpl) {
        deferred.callback(this.wrapImpl(entryImpl));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'get file ' + path + ' in ' +
                this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlDirectoryEntry.prototype.getDirectory = function(path,
    opt_behavior) {
  var implBehavior = /** @type {goog.fs.DirectoryEntry.Behavior|undefined} */ (
      opt_behavior);
  var deferred = new goog.async.Deferred();
  this.dirImpl_.getDirectory(path, implBehavior).addCallbacks(
      function(entryImpl) {
        deferred.callback(this.wrapImpl(entryImpl));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'get directory ' + path + ' in ' +
                this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlDirectoryEntry.prototype.createPath = function(path) {
  var deferred = new goog.async.Deferred();
  this.dirImpl_.createPath(path).addCallbacks(
      function(entryImpl) {
        deferred.callback(this.wrapImpl(entryImpl));
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'create path ' + path + ' in ' +
                this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlDirectoryEntry.prototype.listDirectory = function() {
  var deferred = new goog.async.Deferred();
  this.dirImpl_.listDirectory().addCallbacks(
      function(implList) {
        var entries = goog.array.map(implList, this.wrapImpl, this);
        deferred.callback(entries);
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg, 'list ' + this.fullPath));
      }, this);
  return deferred;
};


/**
 * @override
 */
gf.io.html.HtmlDirectoryEntry.prototype.removeRecursively = function() {
  var deferred = new goog.async.Deferred();
  this.dirImpl_.removeRecursively().addCallbacks(
      function(entryImpl) {
        deferred.callback(null);
      },
      function(arg) {
        deferred.errback(
            gf.io.html.convertError(arg,
                'remove recursively ' + this.fullPath));
      }, this);
  return deferred;
};
