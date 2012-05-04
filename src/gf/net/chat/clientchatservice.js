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

goog.provide('gf.net.chat.ClientChatService');

goog.require('gf.net.chat.ChatService');
goog.require('gf.net.packets.ChatJoin');
goog.require('gf.net.packets.ChatLeave');
goog.require('gf.net.packets.ChatMessage');



/**
 * Manages dispatching chat packets and maintaining channels.
 *
 * @constructor
 * @extends {gf.net.chat.ChatService}
 * @param {!gf.net.ClientSession} session Client session.
 */
gf.net.chat.ClientChatService = function(session) {
  goog.base(this, session);

  /**
   * Client session.
   * @type {!gf.net.ClientSession}
   */
  this.clientSession = session;
};
goog.inherits(gf.net.chat.ClientChatService, gf.net.chat.ChatService);


/**
 * Joins a channel.
 * @param {string} channelId Channel ID.
 */
gf.net.chat.ClientChatService.prototype.join = function(channelId) {
  this.clientSession.send(gf.net.packets.ChatJoin.createData(
      this.clientSession.id,
      channelId,
      goog.now(),
      []));
};


/**
 * Leaves a channel.
 * @param {string} channelId Channel ID.
 */
gf.net.chat.ClientChatService.prototype.leave = function(channelId) {
  this.clientSession.send(gf.net.packets.ChatLeave.createData(
      this.clientSession.id,
      channelId,
      goog.now()));
};


/**
 * Posts a message to a channel.
 * @param {string} channelId Channel ID.
 * @param {string} message Message.
 */
gf.net.chat.ClientChatService.prototype.postMessage = function(channelId,
    message) {
  this.clientSession.send(gf.net.packets.ChatMessage.createData(
      this.clientSession.id,
      channelId,
      goog.now(),
      message));
};


/**
 * @override
 */
gf.net.chat.ClientChatService.prototype.setupSwitch = function(packetSwitch) {
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
gf.net.chat.ClientChatService.prototype.handleChatJoin_ = function(packet,
    packetType, reader) {
  var chatJoin = gf.net.packets.ChatJoin.read(reader);
  if (!chatJoin) {
    return false;
  }

  var user = this.clientSession.getUserBySessionId(chatJoin.sessionId);
  if (!user) {
    return true;
  }
  var channel = this.getChannel(chatJoin.channelId, true);
  if (!channel) {
    return true;
  }

  // Put all users in the channel
  for (var n = 0; n < chatJoin.userList.length; n++) {
    var member = this.clientSession.getUserBySessionId(chatJoin.userList[n]);
    if (member) {
      // Don't queue event
      channel.addUser(member);
    }
  }

  // Add user
  this.queueEvent(channel.addUser(user));

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
gf.net.chat.ClientChatService.prototype.handleChatLeave_ = function(packet,
    packetType, reader) {
  var chatLeave = gf.net.packets.ChatLeave.read(reader);
  if (!chatLeave) {
    return false;
  }
  var user = this.clientSession.getUserBySessionId(chatLeave.sessionId);
  if (!user) {
    return true;
  }
  var channel = this.getChannel(chatLeave.channelId, false);
  if (!channel) {
    return true;
  }

  // Remove user
  this.queueEvent(channel.removeUser(user));

  // TODO(benvanik): if no users in the channel, close it

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
gf.net.chat.ClientChatService.prototype.handleChatMessage_ = function(packet,
    packetType, reader) {
  var chatMessage = gf.net.packets.ChatMessage.read(reader);
  if (!chatMessage) {
    return false;
  }
  var user = this.clientSession.getUserBySessionId(chatMessage.sessionId);
  if (!user) {
    return true;
  }
  var channel = this.getChannel(chatMessage.channelId, false);
  if (!channel) {
    return true;
  }

  // Add message
  this.queueEvent(channel.postMessage(user, chatMessage.message));

  return true;
};
