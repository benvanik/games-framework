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

namespace gf.net.packets;


/**
 * System protocol version. When this changes, all games become incompatible.
 */
const PROTOCOL_VERSION = 3;


/**
 * Maximum reserved number for system packets.
 * This can only ever be lowered, as games will be assigning packets based on
 * its value.
 */
const MAX_SYSTEM_PACKET_TYPE = 63;


/**
 * Simple user statistics.
 */
message UserStatistics {
  uint8 wireId;
  uint16 latency;
};


/**
 * gf.net.UserInfo adapter.
 */
message UserInfo(gf.net.UserInfo) {
  string.<gf.net.AuthType>(...1024) authType;
  string(...1024) authId;
  string(...1024) displayName;
};


/**
 * gf.net.UserAgent adapter.
 */
message UserAgent(gf.net.UserAgent) {
  string.<gf.net.UserAgent.Type>(...1024) type;
  string.<gf.net.UserAgent.Platform>(...1024) platform;
  string(...1024) platformVersion;
  string.<gf.net.UserAgent.Device>(...1024) device;
};


/**
 * gf.net.User adapter.
 */
message User(gf.net.User) {
  string(...16) sessionId;
  uint8 wireId;
  uint32 flags;

  UserInfo info;
  UserAgent agent;
};


/**
 * gf.net.ServerInfo adapter.
 */
message ServerInfo(gf.net.ServerInfo) {
  string name;
  string gameType;
  string gameVersion;
  string location;
  uint32 maximumUsers;
  map.<string, string> properties;
};


/**
 * Sent from client to server to initiate a ping/pong sequence.
 */
message Ping = 1 {
  uint32 serverTime;
  uint32 clientTime;
  uint32 latency;
};


/**
 * Sent from the server to a client that has previously sent a Ping.
 */
message Pong = 2 {
  uint32 serverTime;
  uint32 clientTime;
  array.<UserStatistics> userStatistics;
};


/**
 * Sent from the server to clients upon connection to get server information and
 * a user listing.
 */
message ServerState = 3 {
  ServerInfo info;
  array.<User> users;
};


/**
 * Sent from client to server to request a connection, and then back to the
 * client to confirm. The user information will be updated by the server based
 * on priviledges and contain a populated session and wire ID that must be used
 * for all future communications.
 *
 * Protocol versions will be checked to ensure communication will work. Because
 * this message is the first sent and used for the handshake, the first 4 bytes
 * should never change or be optimized.
 */
fixed message Connect = 4 {
  uint16 systemProtocolVersion;
  uint16 appProtocolVersion;
  User user;
};


/**
 * Sent from client to server to signal a user-initiated disconnection, or
 * from the server to client when the user is being forcefully disconnected.
 */
message Disconnect = 5 {
  uint32.<gf.net.DisconnectReason> reason;
};


/**
 * Sent from the server to clients when a new user connects.
 */
message UserConnect = 6 {
  User user;
};


/**
 * Sent from the server to clients when a user disconnects.
 */
message UserDisconnect = 7 {
  string(...16) sessionId;
  uint32.<gf.net.DisconnectReason> reason;
};


/**
 * Sent from client to server to change their own user info, and server to
 * client to indicate a change in a user.
 */
message UpdateUserInfo = 8 {
  string(...16) sessionId;
  UserInfo info;
};


message ChatJoin = 20 {
  string(...16) sessionId;
  string(...64) channelId;
  uint32 timestamp;
  array.<string(...16)> userList;
};


message ChatLeave = 21 {
  string(...16) sessionId;
  string(...64) channelId;
  uint32 timestamp;
};


message ChatMessage = 22 {
  string(...16) sessionId;
  string(...64) channelId;
  uint32 timestamp;
  string(...1024) message;
};
