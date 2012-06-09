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

goog.provide('gf.net.Session');

goog.require('gf.net.AuthProvider');
goog.require('gf.net.PacketSwitch');
goog.require('gf.net.ServerInfo');
goog.require('gf.net.SessionState');
goog.require('gf.net.UserInfo');
goog.require('gf.timing.Clock');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.object');



/**
 * Abstract network session instance.
 *
 * TODO(benvanik): add a history feature (user join/exit, chat, etc)
 * TODO(benvanik): extract recent users list from history
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} sessionId Unique session ID.
 * @param {gf.net.SessionType} sessionType Session type.
 * @param {number} protocolVersion Application protocol version.
 * @param {!gf.net.AuthToken} authToken Auth service token.
 */
gf.net.Session = function(sessionId, sessionType, protocolVersion, authToken) {
  goog.base(this);

  /**
   * Packet switcher.
   * @type {!gf.net.PacketSwitch}
   */
  this.packetSwitch = new gf.net.PacketSwitch();

  /**
   * Clock used for timing.
   * @type {!gf.timing.Clock}
   */
  this.clock = new gf.timing.Clock();

  /**
   * Unique session ID.
   * Used for registration/etc.
   * @type {string}
   */
  this.id = sessionId;

  /**
   * Session hosting type.
   * @type {gf.net.SessionType}
   */
  this.type = sessionType;

  /**
   * Application protocol version.
   * @type {number}
   */
  this.protocolVersion = protocolVersion;

  /**
   * Information about the server (either self or the remote host).
   * @type {!gf.net.ServerInfo}
   */
  this.info = new gf.net.ServerInfo();

  /**
   * Authentication provider.
   * @type {!gf.net.AuthProvider}
   */
  this.auth = new gf.net.AuthProvider();

  /**
   * Current session state.
   * @type {gf.net.SessionState}
   */
  this.state = gf.net.SessionState.CONNECTING;

  /**
   * All currently connected users.
   * @type {!Array.<!gf.net.User>}
   */
  this.users = [];

  /**
   * User map from sessionId.
   * @private
   * @type {!Object.<!gf.net.User>}
   */
  this.usersBySessionId_ = {};

  /**
   * Users indexed by wire ID.
   * Since wire IDs are all bytes, this is an array instead of a map to make
   * accesses much faster.
   * @private
   * @type {!Array.<gf.net.User>}
   */
  this.usersByWireId_ = new Array(256);

  /**
   * Registered network services.
   * @protected
   * @type {!Array.<!gf.net.NetworkService>}
   */
  this.services = [];
};
goog.inherits(gf.net.Session, goog.Disposable);


/**
 * @override
 */
gf.net.Session.prototype.disposeInternal = function() {
  goog.array.forEach(this.services, goog.dispose);
  this.services.length = 0;

  goog.base(this, 'disposeInternal');
};


/**
 * Registers a new network service.
 * @param {!gf.net.NetworkService} service Service.
 */
gf.net.Session.prototype.registerService = function(service) {
  this.services.push(service);
};


/**
 * Adds a new user to the session and dispatches the event.
 * @protected
 * @param {!gf.net.User} user User to add.
 */
gf.net.Session.prototype.addUser = function(user) {
  this.users.push(user);
  this.usersBySessionId_[user.sessionId] = user;
  this.usersByWireId_[user.wireId] = user;

  // Notify services
  for (var n = 0; n < this.services.length; n++) {
    this.services[n].userConnected(user);
  }
};


/**
 * Removes a user from the session and dispatches the event.
 * @protected
 * @param {!gf.net.User} user User to remove.
 */
gf.net.Session.prototype.removeUser = function(user) {
  goog.object.remove(this.usersBySessionId_, user.sessionId);
  this.usersByWireId_[user.wireId] = null;
  goog.array.remove(this.users, user);

  // Notify services
  for (var n = 0; n < this.services.length; n++) {
    this.services[n].userDisconnected(user);
  }
};


/**
 * Updates a user's information.
 * @protected
 * @param {!gf.net.User} user User to update.
 * @param {!gf.net.UserInfo} userInfo New user information.
 */
gf.net.Session.prototype.updateUser = function(user, userInfo) {
  // Other fields don't make sense (already authed, etc)
  var displayName = userInfo.displayName;
  displayName = gf.net.UserInfo.sanitizeDisplayName(displayName);
  user.info.displayName = displayName;

  // Notify services
  for (var n = 0; n < this.services.length; n++) {
    this.services[n].userUpdated(user);
  }
};


/**
 * Dispatches a packet to all network services.
 * @protected
 * @param {!gf.net.Packet} packet Packet.
 */
gf.net.Session.prototype.dispatchPacket = function(packet) {
  this.packetSwitch.dispatch(packet);
};


/**
 * Finds a user by session ID.
 * @param {string} sessionId Session ID.
 * @return {gf.net.User} User, if found.
 */
gf.net.Session.prototype.getUserBySessionId = function(sessionId) {
  return this.usersBySessionId_[sessionId] || null;
};


/**
 * Finds a user by wire ID.
 * @param {number} wireId Wire ID.
 * @return {gf.net.User} User, if found.
 */
gf.net.Session.prototype.getUserByWireId = function(wireId) {
  return this.usersByWireId_[wireId] || null;
};


/**
 * Polls the network and dispatches events to network services.
 * @param {number=} opt_timeLimit Maximum time a poll can take, in ms.
 *     If a poll starts to take over this amount it will exit and handle the
 *     remaining work on the next action.
 */
gf.net.Session.prototype.poll = goog.abstractMethod;
