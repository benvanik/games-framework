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

goog.provide('gf.net.User');

goog.require('gf.net.DisconnectReason');
goog.require('gf.net.Statistics');
goog.require('gf.net.UserAgent');
goog.require('gf.net.UserInfo');



/**
 * Session user instance.
 * Represents a single user inside of a network session.
 *
 * @constructor
 * @param {string=} opt_sessionId Session ID.
 * @param {number=} opt_wireId Wire ID.
 * @param {number=} opt_flags Flags.
 * @param {gf.net.UserInfo=} opt_userInfo User info.
 * @param {gf.net.UserAgent=} opt_agent Agent.
 */
gf.net.User = function(opt_sessionId, opt_wireId, opt_flags, opt_userInfo,
    opt_agent) {
  /**
   * Session-unique identifier for the user.
   * @type {string}
   */
  this.sessionId = opt_sessionId || '';

  /**
   * Allocated network ID used when transfering packets over the network.
   * Must be > 0 and <= {@see gf.net.User#MAX_WIRE_ID}.
   * @type {number}
   */
  this.wireId = opt_wireId || gf.net.User.NO_WIRE_ID;

  /**
   * User flags bitmask from {@see gf.net.User.Flags}.
   * @type {number}
   */
  this.flags = opt_flags || 0;

  /**
   * User information.
   * @type {!gf.net.UserInfo}
   */
  this.info = opt_userInfo || new gf.net.UserInfo();

  /**
   * User agent.
   * @type {!gf.net.UserAgent}
   */
  this.agent = opt_agent || new gf.net.UserAgent();

  /**
   * Reason the user disconnected, if they did.
   * @type {gf.net.DisconnectReason}
   */
  this.disconnectReason = gf.net.DisconnectReason.USER;

  /**
   * Current user statistics.
   * @type {!gf.net.Statistics}
   */
  this.statistics = new gf.net.Statistics();

  /**
   * Socket used when communicating with the client.
   * Only used on servers.
   * @type {gf.net.Socket}
   */
  this.socket = null;

  /**
   * Application data.
   * @type {Object}
   */
  this.data = null;
};


/**
 * Converts the object to a human-readable string.
 * @return {string} Human-readable string representation.
 */
gf.net.User.prototype.toString = function() {
  return this.info.displayName +
      ' (' + this.sessionId + '/' + this.wireId + ')';
};


/**
 * Clones a user structure for sending over the network.
 * @param {!gf.net.User} user User.
 * @return {!gf.net.User} Cloned user.
 */
gf.net.User.clone = function(user) {
  var clone = new gf.net.User(
      user.sessionId,
      user.wireId,
      user.flags,
      user.info.clone(),
      user.agent.clone());
  return clone;
};


/**
 * Invalid user wire ID.
 * This indicates that an ID has not been assigned or a user is not specified.
 * @const
 * @type {number}
 */
gf.net.User.NO_WIRE_ID = 0;


/**
 * Maximum user wire ID value.
 * @const
 * @type {number}
 */
gf.net.User.MAX_WIRE_ID = 0xFF;


/**
 * User attributes.
 * @enum {number}
 */
gf.net.User.Flags = {
  /**
   * User is the host.
   */
  HOST: 0x00000001,

  /**
   * User has admin rights.
   */
  ADMIN: 0x00000002,

  /**
   * User has debug rights, and can receive logs.
   */
  DEBUG: 0x00000004
};
