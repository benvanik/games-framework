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

goog.provide('gf.net.chat.ChatService');

goog.require('gf.net.NetworkService');
goog.require('gf.net.chat.Channel');
goog.require('goog.object');



/**
 * Manages dispatching chat packets and maintaining channels.
 *
 * @constructor
 * @extends {gf.net.NetworkService}
 * @param {!gf.net.Session} session Session.
 */
gf.net.chat.ChatService = function(session) {
  goog.base(this, session);

  /**
   * Channels, mapped by channel ID.
   * @type {!Object.<!gf.net.chat.Channel>}
   */
  this.channels = {};

  /**
   * New events since the last poll.
   * @private
   * @type {!Array.<!gf.net.chat.Event>}
   */
  this.newEvents_ = [];
};
goog.inherits(gf.net.chat.ChatService, gf.net.NetworkService);


/**
 * @override
 */
gf.net.chat.ChatService.prototype.disposeInternal = function() {
  goog.object.forEach(this.channels, goog.dispose);
  this.channels = {};

  goog.base(this, 'disposeInternal');
};


/**
 * Gets a channel by ID, optionally creating it.
 * @param {string} channelId Channel ID.
 * @param {boolean=} opt_createIfNeeded True to create if not found.
 * @return {gf.net.chat.Channel} Channel, if found.
 */
gf.net.chat.ChatService.prototype.getChannel = function(channelId,
    opt_createIfNeeded) {
  var channel = this.channels[channelId];
  if (!channel && opt_createIfNeeded) {
    channel = new gf.net.chat.Channel(channelId);
    this.channels[channelId] = channel;
  }
  return channel;
};


/**
 * Removes the given user from all channels.
 * Note that this will not broadcast leave messages - it assumes that other
 * clients will do that automatically when they get disconnection events.
 * @param {!gf.net.User} user User to remove.
 */
gf.net.chat.ChatService.prototype.removeUserFromAllChannels =
    function(user) {
  goog.object.forEach(this.channels, function(channel) {
    channel.removeUser(user);
  });
};


/**
 * Queues an event to be delivered on the next poll.
 * @protected
 * @param {gf.net.chat.Event} e Event to add.
 */
gf.net.chat.ChatService.prototype.queueEvent = function(e) {
  if (e) {
    this.newEvents_.push(e);
  }
};


/**
 * Polls for new events.
 * @return {Array.<!gf.net.chat.Event>} New events, if any.
 */
gf.net.chat.ChatService.prototype.poll = function() {
  if (this.newEvents_.length) {
    var events = this.newEvents_;
    this.newEvents_ = [];
    return events;
  }
  return null;
};


/**
 * @override
 */
gf.net.chat.ChatService.prototype.userDisconnected = function(user) {
  this.removeUserFromAllChannels(user);
};
