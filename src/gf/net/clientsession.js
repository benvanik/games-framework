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

goog.provide('gf.net.ClientSession');

goog.require('gf');
goog.require('gf.log');
goog.require('gf.net.DisconnectReason');
goog.require('gf.net.Session');
goog.require('gf.net.SessionState');
goog.require('gf.net.SessionType');
goog.require('gf.net.Socket');
goog.require('gf.net.User');
goog.require('gf.net.UserAgent');
goog.require('gf.net.packets');
goog.require('gf.net.packets.Connect');
goog.require('gf.net.packets.Disconnect');
goog.require('gf.net.packets.Ping');
goog.require('gf.net.packets.Pong');
goog.require('gf.net.packets.ServerState');
goog.require('gf.net.packets.UpdateUserInfo');
goog.require('gf.net.packets.UserConnect');
goog.require('gf.net.packets.UserDisconnect');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('WTF.trace');



/**
 * Client-side network session.
 *
 * @constructor
 * @extends {gf.net.Session}
 * @param {!gf.net.Socket} socket Connected socket.
 * @param {number} protocolVersion Application protocol version.
 * @param {!gf.net.AuthToken} authToken Auth service token.
 * @param {!gf.net.UserInfo} userInfo User information.
 */
gf.net.ClientSession = function(socket, protocolVersion, authToken, userInfo) {
  // NOTE: this random junk may be good enough...
  var sessionId = 'none';
  var sessionType =
      socket.isLocal ? gf.net.SessionType.LOCAL : gf.net.SessionType.REMOTE;
  goog.base(this, sessionId, sessionType, protocolVersion, authToken);

  // Register network handlers
  this.setupNetworking_();

  /**
   * Socket used for communicating with the server.
   * @type {!gf.net.Socket}
   */
  this.socket = socket;
  this.registerDisposable(this.socket);

  /**
   * The reason the session was disconnected.
   * @type {gf.net.DisconnectReason}
   */
  this.disconnectReason = gf.net.DisconnectReason.USER;

  /**
   * A deferred fulfilled when the connect ack is received.
   * @private
   * @type {!goog.async.Deferred}
   */
  this.connectDeferred_ = new goog.async.Deferred();

  // Send connect request
  var user = new gf.net.User(
      sessionId,
      gf.net.User.NO_WIRE_ID,
      0 /* flags */,
      userInfo,
      gf.net.UserAgent.detect());
  this.send(gf.net.packets.Connect.createData(
      gf.net.packets.PROTOCOL_VERSION, protocolVersion, user));

  /**
   * Local user instance - initialized upon connection.
   * @private
   * @type {gf.net.User}
   */
  this.localUser_ = null;
};
goog.inherits(gf.net.ClientSession, gf.net.Session);


/**
 * Ping interval, in ms.
 * @private
 * @const
 * @type {number}
 */
gf.net.ClientSession.PING_INTERVAL_ = 500;


/**
 * Gets a value indicating whether the session is running in local mode.
 * @return {boolean} True if the session is local.
 */
gf.net.ClientSession.prototype.isLocal = function() {
  return this.socket.isLocal;
};


/**
 * Gets the local user in this session.
 * @return {!gf.net.User} Local user.
 */
gf.net.ClientSession.prototype.getLocalUser = function() {
  if (!this.localUser_) {
    this.localUser_ = this.getUserBySessionId(this.id);
    goog.asserts.assert(this.localUser_);
  }
  return this.localUser_;
};


/**
 * Updates the user information and synchronizes with the server.
 * @param {!gf.net.UserInfo} userInfo New user information.
 */
gf.net.ClientSession.prototype.updateUserInfo = function(userInfo) {
  // Server will sanitize better than we can
  this.send(gf.net.packets.UpdateUserInfo.createData(
      this.id,
      userInfo));
};


/**
 * Begins waiting for a connect handshake.
 * @return {!goog.async.Deferred} A deferred fulfilled when a connection has
 *     been established. Successful callbacks will receive the client session
 *     as the only argument. Errbacks receive a {@see gf.net.DisconnectReason}
 *     describing why the connection failed.
 */
gf.net.ClientSession.prototype.waitForConnect = function() {
  return this.connectDeferred_;
};


/**
 * Sets the session as ready and connected.
 * @private
 */
gf.net.ClientSession.prototype.makeReady_ = function() {
  this.state = gf.net.SessionState.CONNECTED;

  // Notify any waiter
  this.connectDeferred_.callback(this);

  // Setup a periodic ping to keep us alive and synchronize times
  var sendPing = WTF.trace.instrument(goog.bind(function() {
    if (this.state != gf.net.SessionState.DISCONNECTED) {
      var serverTime = this.clock.getServerTime() + this.clock.latency;
      var clientTime = this.clock.getClientTime();
      var latencyMs = Math.min(0xFFFF, (this.clock.latency * 1000) | 0);
      this.send(gf.net.packets.Ping.createData(
          (serverTime * 1000) | 0,
          (clientTime * 1000) | 0,
          latencyMs));
    }
    // Stop if disconnected
    if (this.state == gf.net.SessionState.DISCONNECTED) {
      goog.global.clearInterval(pingInterval);
    }
  }, this), 'gf.net.ClientSession#sendPing');
  // Setup timer
  var pingInterval = goog.global.setInterval(sendPing,
      gf.net.ClientSession.PING_INTERVAL_);
  // Call once right away to try to get an accurate RTT ASAP
  sendPing();

  // Notify services
  for (var n = 0; n < this.services.length; n++) {
    this.services[n].connected();
  }
};


/**
 * @override
 */
gf.net.ClientSession.prototype.poll = function(opt_timeLimit) {
  // Wait for the initial connect packet
  if (this.state == gf.net.SessionState.CONNECTING) {
    while (this.socket.canRead) {
      var packet = this.socket.read();
      if (!packet) {
        return;
      }

      // The first packet should be our ack
      this.dispatchPacket(packet);
      return;
    }
  } else {
    // Read all packets
    // NOTE: we do this BEFORE disconnection logic so that we can get the last
    //     of the packets the server sent
    var start = gf.now();
    while (this.socket.canRead) {
      var packet = this.socket.read();
      if (!packet) {
        break;
      }

      var user = this.getLocalUser();
      user.statistics.bytesReceived += packet.data.byteLength;

      this.dispatchPacket(packet);

      if (opt_timeLimit && gf.now() - start >= opt_timeLimit) {
        break;
      }
    }
  }

  // Check for disconnection
  if (this.socket.state == gf.net.Socket.State.CLOSED) {
    this.setDisconnected_(gf.net.DisconnectReason.TIMEOUT);
  }
};


/**
 * Registers networking handlers.
 * @private
 */
gf.net.ClientSession.prototype.setupNetworking_ = function() {
  this.packetSwitch.register(
      gf.net.packets.Pong.ID,
      this.handlePong_, this);
  this.packetSwitch.register(
      gf.net.packets.ServerState.ID,
      this.handleServerState_, this);
  this.packetSwitch.register(
      gf.net.packets.UserConnect.ID,
      this.handleUserConnect_, this);
  this.packetSwitch.register(
      gf.net.packets.UserDisconnect.ID,
      this.handleUserDisconnect_, this);
  this.packetSwitch.register(
      gf.net.packets.UpdateUserInfo.ID,
      this.handleUpdateUserInfo_, this);
  this.packetSwitch.register(
      gf.net.packets.Connect.ID,
      this.handleConnect_, this);
  this.packetSwitch.register(
      gf.net.packets.Disconnect.ID,
      this.handleDisconnect_, this);
};


/**
 * Handles pong packets from the server.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ClientSession.prototype.handlePong_ = function(packet, packetType,
    reader) {
  var pong = gf.net.packets.Pong.read(reader);
  if (!pong) {
    return false;
  }

  var currentClientTime = this.clock.getClientTime();
  var rtt = currentClientTime - pong.clientTime / 1000;
  var latency = Math.abs(rtt) / 2;
  this.clock.updateServerTime(pong.serverTime / 1000, latency);

  for (var n = 0; n < pong.userStatistics.length; n++) {
    var userStats = pong.userStatistics[n];
    var user = this.getUserByWireId(userStats.wireId);
    if (user) {
      user.statistics.averageLatency = userStats.latency;
    }
  }

  return true;
};


/**
 * Handles server info packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ClientSession.prototype.handleServerState_ = function(packet, packetType,
    reader) {
  var serverInfo = gf.net.packets.ServerState.read(reader);
  if (!serverInfo) {
    return false;
  }

  this.info = serverInfo.info.clone();
  for (var n = 0; n < serverInfo.users.length; n++) {
    this.addUser(gf.net.User.clone(serverInfo.users[n]));
  }

  // Now connected - notify waiters
  this.makeReady_();

  return true;
};


/**
 * Handles user connection packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ClientSession.prototype.handleUserConnect_ = function(packet, packetType,
    reader) {
  var userConnect = gf.net.packets.UserConnect.read(reader);
  if (!userConnect) {
    return false;
  }

  // Add to listing
  this.addUser(gf.net.User.clone(userConnect.user));

  return true;
};


/**
 * Handles user disconnection packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ClientSession.prototype.handleUserDisconnect_ = function(packet,
    packetType, reader) {
  var userDisconnect = gf.net.packets.UserDisconnect.read(reader);
  if (!userDisconnect) {
    return false;
  }

  var user = this.getUserBySessionId(userDisconnect.sessionId);
  if (!user) {
    return true;
  }

  // Remove from listing
  user.disconnectReason = userDisconnect.reason;
  this.removeUser(user);

  return true;
};


/**
 * Handles user update notification packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ClientSession.prototype.handleUpdateUserInfo_ = function(packet,
    packetType, reader) {
  var updateUserInfo = gf.net.packets.UpdateUserInfo.read(reader);
  if (!updateUserInfo) {
    return false;
  }

  var user = this.getUserBySessionId(updateUserInfo.sessionId);
  if (!user) {
    return true;
  }

  // Update
  this.updateUser(user, updateUserInfo.info);

  return true;
};


/**
 * Handles connect packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ClientSession.prototype.handleConnect_ = function(packet, packetType,
    reader) {
  var connect = gf.net.packets.Connect.read(reader);
  if (!connect) {
    return false;
  }

  // Connect response - take the data sent back as truth as the server may
  // have modified it based on privs and such (as well as giving us IDs)
  this.id = connect.user.sessionId;

  return true;
};


/**
 * Handles disconnect packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ClientSession.prototype.handleDisconnect_ = function(packet, packetType,
    reader) {
  var disconnect = gf.net.packets.Disconnect.read(reader);
  if (!disconnect) {
    return false;
  }

  gf.log.write('disconnected by server', disconnect.reason);
  this.setDisconnected_(disconnect.reason);

  return true;
};


/**
 * Sets the disconnected state.
 * @private
 * @param {gf.net.DisconnectReason} reason Reason for disconnection.
 */
gf.net.ClientSession.prototype.setDisconnected_ = function(reason) {
  this.state = gf.net.SessionState.DISCONNECTED;
  this.disconnectReason = reason;

  goog.dispose(this.socket);

  // Notify services
  for (var n = 0; n < this.services.length; n++) {
    this.services[n].disconnected();
  }

  // Error out connect waiters
  if (!this.connectDeferred_.hasFired()) {
    this.connectDeferred_.errback(this.disconnectReason);
  }
};


/**
 * Sends a disconnect request.
 */
gf.net.ClientSession.prototype.disconnect = function() {
  this.send(gf.net.packets.Disconnect.createData(
      gf.net.DisconnectReason.USER));
  this.socket.flush(true);
  this.setDisconnected_(gf.net.DisconnectReason.USER);
};


/**
 * Sends data to the server.
 * @param {ArrayBuffer} data Data to write.
 */
gf.net.ClientSession.prototype.send = function(data) {
  if (!data) {
    return;
  }

  // Check for disconnection
  if (this.socket.state == gf.net.Socket.State.CLOSED) {
    this.setDisconnected_(gf.net.DisconnectReason.TIMEOUT);
    return;
  }

  if (this.state == gf.net.SessionState.DISCONNECTED) {
    return;
  } else if (this.state == gf.net.SessionState.CONNECTED) {
    var user = this.getLocalUser();
    user.statistics.bytesSent += data.byteLength;
  }

  this.socket.write(data);
};
