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

goog.provide('gf.net.chat.Channel');

goog.require('gf.net.chat.Event');
goog.require('gf.net.chat.EventType');
goog.require('goog.Disposable');
goog.require('goog.array');



/**
 * Chat channel (aka 'room').
 * Channels have membership and history.
 *
 * TODO(benvanik): logging to file/etc
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} channelId Chat channel ID.
 */
gf.net.chat.Channel = function(channelId) {
  goog.base(this);

  /**
   * Chat channel ID.
   * @type {string}
   */
  this.channelId = channelId;

  /**
   * All users currently in the channel.
   * @type {!Array.<!gf.net.User>}
   */
  this.users = [];

  /**
   * Event history for teh channel.
   * @type {!Array.<!gf.net.chat.Event>}
   */
  this.events = [];
};
goog.inherits(gf.net.chat.Channel, goog.Disposable);


/**
 * Adds a user to the channel.
 * @param {!gf.net.User} user User being added.
 * @return {gf.net.chat.Event} New event.
 */
gf.net.chat.Channel.prototype.addUser = function(user) {
  if (goog.array.contains(this.users, user)) {
    return null;
  }
  this.users.push(user);
  var e = new gf.net.chat.Event(
      this,
      gf.net.chat.EventType.USER_JOIN,
      user.sessionId,
      user.info.displayName,
      goog.now());
  this.events.push(e);
  return e;
};


/**
 * Removes a user from the channel.
 * @param {!gf.net.User} user User being removed.
 * @return {gf.net.chat.Event} New event.
 */
gf.net.chat.Channel.prototype.removeUser = function(user) {
  if (goog.array.remove(this.users, user)) {
    var e = new gf.net.chat.Event(
        this,
        gf.net.chat.EventType.USER_LEAVE,
        user.sessionId,
        user.info.displayName,
        goog.now());
    this.events.push(e);
    return e;
  }
  return null;
};


/**
 * Posts a message to the channel.
 * @param {!gf.net.User} user User posting the message.
 * @param {string} message Message.
 * @return {gf.net.chat.Event} New event.
 */
gf.net.chat.Channel.prototype.postMessage = function(user, message) {
  if (!goog.array.contains(this.users, user)) {
    return null;
  }
  var e = new gf.net.chat.Event(
      this,
      gf.net.chat.EventType.USER_MESSAGE,
      user.sessionId,
      user.info.displayName,
      goog.now(),
      message);
  this.events.push(e);
  return e;
};
