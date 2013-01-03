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

goog.provide('gf.net.sockets.PortSocket');

goog.require('gf');
goog.require('gf.log');
goog.require('gf.net.Packet');
goog.require('gf.net.Socket');
goog.require('gf.util');
goog.require('goog.userAgent.product');



/**
 * A socket using HTML message ports for communicating between windows or
 * web workers.
 *
 * @constructor
 * @extends {gf.net.Socket}
 * @param {gf.net.Endpoint} endpoint Endpoint.
 * @param {!MessagePort|!Worker|!SharedWorker} handle Underlying port handle.
 */
gf.net.sockets.PortSocket = function(endpoint, handle) {
  goog.base(this, endpoint);

  // Ports are always local
  this.isLocal = true;

  // Ports are always connected
  this.state = gf.net.Socket.State.CONNECTED;

  /**
   * Underlying port handle.
   * @private
   * @type {!MessagePort|!Worker|!SharedWorker}
   */
  this.handle_ = handle;

  /**
   * Whether the port will allow Transferable arrays.
   * Currently this requires a prefixed postMessage call, and Chrome has a bug
   * where webkitPostMessage fails to SharedWorkers.
   * @private
   * @type {boolean}
   */
  this.supportsTransferableArrays_ =
      !!handle['webkitPostMessage'] &&
      !(goog.global.MessagePort && handle instanceof MessagePort);

  /**
   * Whether the MessagePort will allow ArrayBuffers to be passed.
   * The only way to detect this is to try to post a message, unfortunately.
   * For now, I know both FF and Chrome support it.
   * @private
   * @type {boolean}
   */
  this.canUseArrayBuffers_ = !goog.userAgent.product.OPERA;

  // Listen for messages
  var self = this;
  this.handle_.onmessage = function(e) {
    self.handleMessage_(e);
  };
  this.handle_.onerror = function(e) {
    gf.log.write('port error', e);
  };

  if (!gf.SERVER) {
    // Clients need to register unload handlers to close the ports
    // Note that unload is not always called (especially on mobile)
    /**
     * @private
     * @type {Function}
     */
    this.boundHandleUnload_ = goog.bind(this.handleUnload_, this);
    goog.global.addEventListener('unload', this.boundHandleUnload_, false);
  }
};
goog.inherits(gf.net.sockets.PortSocket, gf.net.Socket);


/**
 * Handles messages from the port.
 * @private
 * @param {!MessageEvent} e Event.
 */
gf.net.sockets.PortSocket.prototype.handleMessage_ = function(e) {
  var data = e.data;

  var packet = null;
  if (data instanceof ArrayBuffer) {
    packet = new gf.net.Packet(data);
  } else if (goog.isString(data)) {
    packet = new gf.net.Packet(gf.util.stringToArrayBuffer(
        /** @type {string} */ (data)));
  } else if (data && data['close']) {
    // Currently just the close message
    this.close();
  }

  if (packet) {
    this.queueRead(packet);
  }
};


/**
 * Handles window unload events.
 * @private
 * @param {Event} e Event.
 */
gf.net.sockets.PortSocket.prototype.handleUnload_ = function(e) {
  this.close();
};


/**
 * @override
 */
gf.net.sockets.PortSocket.prototype.writeInternal = function(data) {
  if (this.supportsTransferableArrays_) {
    this.handle_['webkitPostMessage'](data, [data]);
  } else if (this.canUseArrayBuffers_) {
    this.handle_.postMessage(data);
  } else {
    this.handle_.postMessage(gf.util.arrayBufferToString(data));
  }
};


/**
 * @override
 */
gf.net.sockets.PortSocket.prototype.close = function() {
  this.handle_.onmessage = null;

  if (!gf.SERVER) {
    goog.global.removeEventListener('unload', this.boundHandleUnload_, false);
  }

  try {
    // HACK: there are no close events on ports or workers, so this is required
    // to indicate to the other side that we are dying
    this.handle_.postMessage({'close': true});
    if (this.handle_.close) {
      this.handle_.close();
    }
  } catch (e) {
  }

  goog.base(this, 'close');
};
