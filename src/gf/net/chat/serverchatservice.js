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

goog.provide('gf.net.chat.ServerChatService');

goog.require('gf.log');
goog.require('gf.net.chat.ChatService');
goog.require('gf.net.packets.ChatJoin');
goog.require('gf.net.packets.ChatLeave');
goog.require('gf.net.packets.ChatMessage');



/**
 * Manages dispatching chat packets and maintaining channels.
 *
 * @constructor
 * @extends {gf.net.chat.ChatService}
 * @param {!gf.net.ServerSession} session Server session.
 */
gf.net.chat.ServerChatService = function(session) {
  goog.base(this, session);

  /**
   * Server session.
   * @type {!gf.net.ServerSession}
   */
  this.serverSession = session;
};
goog.inherits(gf.net.chat.ServerChatService, gf.net.chat.ChatService);


/**
 * Forces a user to join a channel.
 * @param {!gf.net.User} user User to join.
 * @param {string} channelId Channel ID.
 * @param {number=} opt_timestamp Time the event occurred.
 */
gf.net.chat.ServerChatService.prototype.join = function(user, channelId,
    opt_timestamp) {
  var channel = this.getChannel(channelId, true);
  if (!channel) {
    return;
  }

  var timestamp = goog.now();
  if (goog.isDef(opt_timestamp) && (timestamp - opt_timestamp) < 1000) {
    timestamp = opt_timestamp;
  }

  // Add user
  channel.addUser(user);

  // Send response with the user listing
  var userList = new Array(channel.users.length);
  for (var n = 0; n < channel.users.length; n++) {
    var member = channel.users[n];
    userList[n] = member.sessionId;
  }
  this.serverSession.send(gf.net.packets.ChatJoin.createData(
      member.sessionId,
      channel.channelId,
      timestamp,
      userList), user);

  // Broadcast join message to all users in the group except the joining user
  var joinData = gf.net.packets.ChatJoin.createData(
      user.sessionId,
      channel.channelId,
      timestamp,
      []);
  for (var n = 0; n < channel.users.length; n++) {
    var member = channel.users[n];
    // Already sent the user the message above, so don't end here
    if (member != user) {
      this.serverSession.send(joinData, member);
    }
  }
};


/**
 * Forces a user to leave a channel.
 * @param {!gf.net.User} user User to leave.
 * @param {string} channelId Channel ID.
 * @param {number=} opt_timestamp Time the event occurred.
 */
gf.net.chat.ServerChatService.prototype.leave = function(user, channelId,
    opt_timestamp) {
  var channel = this.getChannel(channelId, false);
  if (!channel) {
    return;
  }

  var timestamp = goog.now();
  if (goog.isDef(opt_timestamp) && (timestamp - opt_timestamp) < 1000) {
    timestamp = opt_timestamp;
  }

  // Broadcast leave message to all users in the group
  // Note: includes the user who just left
  var leaveData = gf.net.packets.ChatLeave.createData(
      user.sessionId,
      channel.channelId,
      timestamp);
  for (var n = 0; n < channel.users.length; n++) {
    var member = channel.users[n];
    this.serverSession.send(leaveData, member);
  }

  // Remove user
  channel.removeUser(user);

  // TODO(benvanik): if no users in the channel, close it
};


/**
 * @override
 */
gf.net.chat.ServerChatService.prototype.setupSwitch = function(packetSwitch) {
  packetSwitch.register(
      gf.net.packets.ChatJoin.ID,
      this.handleChatJoin_, this);
  packetSwitch.register(
      gf.net.packets.ChatLeave.ID,
      this.handleChatLeave_, this);
  packetSwitch.register(
      gf.net.packets.ChatMessage.ID,
      this.handleChatMessage_, this);
};


/**
 * Handles chat join packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.chat.ServerChatService.prototype.handleChatJoin_ = function(packet,
    packetType, reader) {
  // All packets must be authed
  var user = packet.user;
  if (!user) {
    return false;
  }
  var chatJoin = gf.net.packets.ChatJoin.read(reader);
  if (!chatJoin) {
    return false;
  }
  if (chatJoin.sessionId != user.sessionId) {
    gf.log.write('user info mismatch');
    return false;
  }

  this.join(user, chatJoin.channelId, chatJoin.timestamp);

  return true;
};


/**
 * Handles chat leave packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.chat.ServerChatService.prototype.handleChatLeave_ = function(packet,
    packetType, reader) {
  // All packets must be authed
  var user = packet.user;
  if (!user) {
    return false;
  }
  var chatLeave = gf.net.packets.ChatLeave.read(reader);
  if (!chatLeave) {
    return false;
  }
  if (chatLeave.sessionId != user.sessionId) {
    gf.log.write('user info mismatch');
    return false;
  }

  this.leave(user, chatLeave.channelId, chatLeave.timestamp);

  return true;
};


/**
 * Handles chat message packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.chat.ServerChatService.prototype.handleChatMessage_ = function(packet,
    packetType, reader) {
  // All packets must be authed
  var user = packet.user;
  if (!user) {
    return false;
  }
  var chatMessage = gf.net.packets.ChatMessage.read(reader);
  if (!chatMessage) {
    return false;
  }
  if (chatMessage.sessionId != user.sessionId) {
    gf.log.write('user info mismatch');
    return false;
  }

  var channel = this.getChannel(chatMessage.channelId, false);
  if (!channel) {
    return true;
  }

  // Add message
  channel.postMessage(user, chatMessage.message);

  // Broadcast message to all users in the group
  var messageData = gf.net.packets.ChatMessage.createData(
      user.sessionId,
      channel.channelId,
      goog.now(),
      chatMessage.message);
  for (var n = 0; n < channel.users.length; n++) {
    var member = channel.users[n];
    this.serverSession.send(messageData, member);
  }

  return true;
};
