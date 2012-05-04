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

goog.provide('gf.assets.BuildClient');

goog.require('gf');
goog.require('gf.log');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.json');
goog.require('goog.object');



/**
 * Client for the build daemon, capable of notifying observers of asset changes.
 * Observers must ensure that they properly unregister themselves from the
 * client or they will be leaked. It's best to perform this in their dispose.
 *
 * A connection to the build daemon will be attempted at startup and if it
 * cannot be reached will be retried every few seconds.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.Runtime} runtime Current runtime.
 */
gf.assets.BuildClient = function(runtime) {
  goog.base(this);

  gf.log.write('WARNING: running with BuildClient - do not ship!');

  /**
   * Runtime that the component is currently registered in.
   * @type {!gf.Runtime}
   */
  this.runtime = runtime;

  /**
   * A map of all observers, using {@see goog.getUid} for the key.
   * @private
   * @type {!Object.<!gf.assets.Observer>}
   */
  this.observers_ = {};

  /**
   * Underlying port handle.
   * @private
   * @type {WebSocket}
   */
  this.handle_ = null;

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleOpen_ = goog.bind(this.handleOpen_, this);

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleError_ = goog.bind(this.handleError_, this);

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleClose_ = goog.bind(this.handleClose_, this);

  /**
   * @private
   * @type {Function}
   */
  this.boundHandleMessage_ = goog.bind(this.handleMessage_, this);

  this.open();
};
goog.inherits(gf.assets.BuildClient, goog.Disposable);


/**
 * @override
 */
gf.assets.BuildClient.prototype.disposeInternal = function() {
  this.close();

  goog.base(this, 'disposeInternal');
};


/**
 * Retry delay, in ms, for connection attempts.
 * @private
 * @const
 * @type {number}
 */
gf.assets.BuildClient.RETRY_DELAY_ = 5000;


/**
 * Opens a connection to the build server.
 */
gf.assets.BuildClient.prototype.open = function() {
  if (this.handle_) {
    this.close();
  }

  var address = this.runtime.launchOptions.buildServer;
  goog.asserts.assert(address);

  if (goog.global['MozWebSocket']) {
    this.handle_ = new goog.global['MozWebSocket'](address);
  } else {
    this.handle_ = new WebSocket(address);
  }
  if (!this.handle_) {
    gf.log.write('Unable to create socket to server - failing permanently');
    return;
  }

  // Listen for messages
  this.handle_.addEventListener('open', this.boundHandleOpen_, false);
  this.handle_.addEventListener('error', this.boundHandleError_, false);
  this.handle_.addEventListener('close', this.boundHandleClose_, false);
  this.handle_.addEventListener('message', this.boundHandleMessage_, false);
};


/**
 * Closes the connection to the build server.
 */
gf.assets.BuildClient.prototype.close = function() {
  if (!this.handle_) {
    return;
  }
  this.handle_.removeEventListener('open', this.boundHandleOpen_, false);
  this.handle_.removeEventListener('error', this.boundHandleError_, false);
  this.handle_.removeEventListener('close', this.boundHandleClose_, false);
  this.handle_.removeEventListener('message', this.boundHandleMessage_, false);
  this.handle_.close();
  this.handle_ = null;
};


/**
 * Handles open notifications.
 * @private
 * @param {!Event} e Event.
 */
gf.assets.BuildClient.prototype.handleOpen_ = function(e) {
  var address = this.runtime.launchOptions.buildServer;
  gf.log.write('Connected to build daemon at ' + address + '...');
};


/**
 * Handles error notifications.
 * @private
 * @param {!Event} e Event.
 */
gf.assets.BuildClient.prototype.handleError_ = function(e) {
  gf.log.write('Error communicating with build server', e);
};


/**
 * Handles close notifications.
 * @private
 * @param {!Event} e Event.
 */
gf.assets.BuildClient.prototype.handleClose_ = function(e) {
  gf.log.write('Disconnected from build server... retrying');

  this.close();

  // Retry in a few seconds
  goog.global.setTimeout(goog.bind(function() {
    this.open();
  }, this), gf.assets.BuildClient.RETRY_DELAY_);
};


/**
 * Handles messages from the web socket.
 * @private
 * @param {!Event} e Event.
 */
gf.assets.BuildClient.prototype.handleMessage_ = function(e) {
  var data = /** @type {Object} */ (goog.json.parse(e.data));

  // data should be a list of notification tracking tags
  var tags = /** @type {Array.<string>} */ (data['tags']);
  if (tags) {
    this.notifyObservers_(tags);
  }
};


/**
 * Notifies all observers of changes to the given assets.
 * @private
 * @param {!Array.<string>} tags Asset tags.
 */
gf.assets.BuildClient.prototype.notifyObservers_ = function(tags) {
  // Fixup tags - they are all paths relative to the build script, but the code
  // gen is all relative to gf.BIN_PATH
  for (var n = 0; n < tags.length; n++) {
    tags[n] = gf.BIN_PATH + tags[n];
  }

  gf.log.write('assets changed:', tags);

  // Notify everyone
  goog.object.forEach(this.observers_,
      /**
       * @param {!gf.assets.Observer} observer Observer.
       */
      function(observer) {
        observer.notifyAssetsChanged(tags);
      });
};


/**
 * Adds an observer for asset change notifications.
 * @param {!gf.assets.Observer} observer Observer.
 */
gf.assets.BuildClient.prototype.addObserver = function(observer) {
  var key = goog.getUid(observer);
  this.observers_[key] = observer;
};


/**
 * Removes an observer from receiving asset change notifications.
 * @param {!gf.assets.Observer} observer Observer.
 */
gf.assets.BuildClient.prototype.removeObserver = function(observer) {
  var key = goog.getUid(observer);
  goog.object.remove(this.observers_, key);
};
