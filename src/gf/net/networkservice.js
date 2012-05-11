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

goog.provide('gf.net.NetworkService');

goog.require('goog.Disposable');



/**
 * Base type for network services.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.net.Session} session Session.
 */
gf.net.NetworkService = function(session) {
  goog.base(this);

  /**
   * Session.
   * @type {!gf.net.Session}
   */
  this.session = session;

  this.setupSwitch(session.packetSwitch);
};
goog.inherits(gf.net.NetworkService, goog.Disposable);


/**
 * Sets up the packet switching handlers for the service.
 * @protected
 * @param {!gf.net.PacketSwitch} packetSwitch Packet switch.
 */
gf.net.NetworkService.prototype.setupSwitch = goog.nullFunction;


/**
 * Handles session connection/ready.
 */
gf.net.NetworkService.prototype.connected = goog.nullFunction;


/**
 * Handles session disconnected/unready.
 */
gf.net.NetworkService.prototype.disconnected = goog.nullFunction;


/**
 * Handles user that has connected.
 * @param {!gf.net.User} user User.
 */
gf.net.NetworkService.prototype.userConnected = goog.nullFunction;


/**
 * Handles users that has disconnected.
 * @param {!gf.net.User} user User.
 */
gf.net.NetworkService.prototype.userDisconnected = goog.nullFunction;


/**
 * Handles users that have updated their information.
 * @param {!gf.net.User} user User.
 */
gf.net.NetworkService.prototype.userUpdated = goog.nullFunction;
