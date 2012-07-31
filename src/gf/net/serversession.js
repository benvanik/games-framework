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

goog.provide('gf.net.ServerSession');

goog.require('gf');
goog.require('gf.log');
goog.require('gf.net.DisconnectReason');
goog.require('gf.net.PacketReader');
goog.require('gf.net.Session');
goog.require('gf.net.SessionState');
goog.require('gf.net.SessionType');
goog.require('gf.net.Socket');
goog.require('gf.net.User');
goog.require('gf.net.packets');
goog.require('gf.net.packets.Connect');
goog.require('gf.net.packets.Disconnect');
goog.require('gf.net.packets.Ping');
goog.require('gf.net.packets.Pong');
goog.require('gf.net.packets.ServerState');
goog.require('gf.net.packets.UpdateUserInfo');
goog.require('gf.net.packets.UserConnect');
goog.require('gf.net.packets.UserDisconnect');
goog.require('gf.net.packets.UserStatistics');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.string');



/**
 * Server-side network session.
 *
 * @constructor
 * @extends {gf.net.Session}
 * @param {!gf.net.ListenSocket} socket Listening socket.
 * @param {number} protocolVersion Application protocol version.
 * @param {!gf.net.AuthToken} authToken Auth service token.
 * @param {!gf.net.ServerInfo} serverInfo Server information.
 */
gf.net.ServerSession = function(socket, protocolVersion, authToken,
    serverInfo) {
  var sessionId = '0';
  var sessionType = gf.NODE ?
      gf.net.SessionType.REMOTE :
      gf.net.SessionType.LOCAL;
  goog.base(this, sessionId, sessionType, protocolVersion, authToken);

  // Register network handlers
  this.setupNetworking_();

  /**
   * Socket used for listening.
   * @type {!gf.net.ListenSocket}
   */
  this.socket = socket;

  /**
   * Server information.
   * @type {!gf.net.ServerInfo}
   */
  this.serverInfo = serverInfo;

  /**
   * Whether the server is currently listening for new connections.
   * @private
   * @type {boolean}
   */
  this.ready_ = false;

  /**
   * Sockets that have connected but not yet sent connect requests.
   * @private
   * @type {!Array.<!gf.net.Socket>}
   */
  this.joiningSockets_ = [];

  /**
   * A list of all available wire IDs.
   * If this list is empty we are out.
   * Note that 0 is not a valid ID.
   * @private
   * @type {!Array.<number>}
   */
  this.availableWireIds_ = new Array(255);
  for (var n = 1; n < this.availableWireIds_.length; n++) {
    this.availableWireIds_[n - 1] = n;
  }
};
goog.inherits(gf.net.ServerSession, gf.net.Session);


/**
 * @override
 */
gf.net.ServerSession.prototype.disposeInternal = function() {
  this.unready();

  goog.base(this, 'disposeInternal');
};


/**
 * Signals that the session is ready and can start accepting connections.
 */
gf.net.ServerSession.prototype.ready = function() {
  goog.asserts.assert(!this.ready_);
  this.ready_ = true;
  this.state = gf.net.SessionState.CONNECTED;

  // Begin listening for connections (and handle ones that were waiting)
  this.socket.begin(goog.bind(this.handleConnect_, this));

  // Notify services
  for (var n = 0; n < this.services.length; n++) {
    this.services[n].connected();
  }

  gf.log.write('Server ready, listening on', this.socket.endpoint.toString());
};


/**
 * Signals that the session is no longer ready and should stop accepting
 * connections.
 */
gf.net.ServerSession.prototype.unready = function() {
  if (!this.ready_) {
    return;
  }
  this.ready_ = false;
  this.state = gf.net.SessionState.CONNECTING;

  // Stop listening
  this.socket.begin(null);

  // Notify services
  for (var n = 0; n < this.services.length; n++) {
    this.services[n].disconnected();
  }
};


/**
 * Handles newly connected sockets.
 * @private
 * @param {!gf.net.Socket} socket Newly connected socket.
 */
gf.net.ServerSession.prototype.handleConnect_ = function(socket) {
  if (!gf.NODE) {
    gf.log.attachPort(/** @type {!MessagePort} */ (socket.endpoint));
  }

  // Place socket in joining pool
  // The socket will be polled in the normal flow
  this.joiningSockets_.push(socket);
};


/**
 * Adds a user to the users collection and notifies everyone.
 * @private
 * @param {!gf.net.User} user User to add.
 */
gf.net.ServerSession.prototype.addUser_ = function(user) {
  // Assign a session ID - probably unique enough, and ensure no one else has it
  while (true) {
    user.sessionId = goog.string.getRandomString();
    if (!this.getUserBySessionId(user.sessionId)) {
      break;
    }
  }

  // Assign a wire ID
  goog.asserts.assert(this.availableWireIds_.length);
  user.wireId = this.availableWireIds_.shift();

  // Broadcast connection event (before add so that the user connecting doesn't
  // get it)
  this.send(gf.net.packets.UserConnect.createData(
      gf.net.User.clone(user)));

  // Send connect ack
  // This must be sent before any other packets
  this.send(gf.net.packets.Connect.createData(
      gf.net.packets.PROTOCOL_VERSION, this.protocolVersion, user), user);

  // Send user the current server state/etc
  // This must be the second packet sent
  var userListing = goog.array.map(this.users, gf.net.User.clone);
  userListing.push(gf.net.User.clone(user));
  this.send(gf.net.packets.ServerState.createData(
      this.info.clone(), userListing), user);

  // Add
  this.addUser(user);
};


/**
 * Removes a user from the users collection and notifies everyone.
 * @private
 * @param {!gf.net.User} user User to remove.
 */
gf.net.ServerSession.prototype.removeUser_ = function(user) {
  if (!user.socket ||
      this.getUserBySessionId(user.sessionId) != user) {
    return;
  }

  // Shutdown the socket
  user.socket.close();

  // Remove
  // Done first so that we don't send the disconnection broadcast to them
  this.removeUser(user);

  // Broadcast disconnection
  this.send(gf.net.packets.UserDisconnect.createData(
      user.sessionId, user.disconnectReason));

  // Return the wire ID to the pool
  if (user.wireId != gf.net.User.NO_WIRE_ID) {
    this.availableWireIds_.push(user.wireId);
    user.wireId = gf.net.User.NO_WIRE_ID;
  }
};


/**
 * Forcefully disconnects a user and notifies everyone.
 * @param {!gf.net.User} user User to remove.
 * @param {gf.net.DisconnectReason} reason Disconnect reason.
 */
gf.net.ServerSession.prototype.disconnectUser = function(user, reason) {
  // Send disconnection message
  if (user.socket.state == gf.net.Socket.State.CLOSED) {
    this.send(gf.net.packets.Disconnect.createData(reason), user);
  }

  // Save in case we need it later (history/etc)
  user.disconnectReason = reason;

  // Remove from the session
  this.removeUser_(user);
};


/**
 * @override
 */
gf.net.ServerSession.prototype.poll = function(opt_timeLimit) {
  // Handle any joining sockets
  if (this.joiningSockets_.length) {
    this.pollJoiningSockets_();
  }

  // Poll users
  var start = gf.now();
  for (var n = 0; n < this.users.length; n++) {
    var user = this.users[n];

    // Read all packets
    // NOTE: we do this BEFORE disconnection logic so that we can get the last
    // of the packets the user sent
    while (user.socket.canRead) {
      // Packet waiting
      var packet = user.socket.read();
      if (!packet) {
        break;
      }
      packet.user = user;
      user.bytesSent += packet.data.byteLength;

      this.dispatchPacket(packet);
    }

    // Handle disconnections
    if (!user.socket || user.socket.state == gf.net.Socket.State.CLOSED) {
      user.disconnectReason = gf.net.DisconnectReason.TIMEOUT;
      this.removeUser_(user);
      continue;
    }

    // TODO(benvanik): prevent the risk of DOS by randomizing the walking of
    // the user list -- with this behavior, it's possible for one user to
    // flood the server with expensive calls and deny network processing to
    // all other users
    if (opt_timeLimit && gf.now() - start >= opt_timeLimit) {
      break;
    }
  }
};


/**
 * Polls joining sockets and promotes them to users if they have sent the right
 * data.
 * @private
 */
gf.net.ServerSession.prototype.pollJoiningSockets_ = function() {
  // Poll all sockets
  var reader = gf.net.PacketReader.getSharedReader();
  for (var n = 0; n < this.joiningSockets_.length; n++) {
    var socket = this.joiningSockets_[n];
    var removeFromList = false;
    var deny = false;
    var reason = gf.net.DisconnectReason.TIMEOUT;
    if (socket.state != gf.net.Socket.State.CLOSED) {
      // Read packets
      while (socket.canRead) {
        var packet = socket.read();
        if (!packet) {
          break;
        }
        reader.begin(packet.data, 0);
        var packetType = reader.readUint8();
        if (packetType == gf.net.packets.Connect.ID) {
          // Connecting! Verify they're good and add them!
          var connect = gf.net.packets.Connect.read(reader);

          // Prevent new connections when full (or potentially full)
          // Note that we do this check here instead of in socket connect so
          // that we can send a good message back to the user
          if (this.users.length + 1 > this.serverInfo.maximumUsers) {
            deny = true;
            reason = gf.net.DisconnectReason.SERVER_FULL;
          }

          // Verify protocols
          if (!deny) {
            if (connect.systemProtocolVersion !=
                gf.net.packets.PROTOCOL_VERSION ||
                connect.appProtocolVersion != this.protocolVersion) {
              deny = true;
              reason = gf.net.DisconnectReason.PROTOCOL_MISMATCH;
            }
          }

          // Verify user
          if (!deny) {
            var user = gf.net.User.clone(connect.user);
            if (this.validateUser_(user)) {
              user.socket = socket;
              this.addUser_(user);
            } else {
              deny = true;
              reason = gf.net.DisconnectReason.ACCESS_DENIED;
            }
          }
          removeFromList = true;
        } else {
          // Bad user - kill them
          removeFromList = true;
          deny = true;
          reason = gf.net.DisconnectReason.UNEXPECTED_DATA;
        }
      }
    } else {
      // User was disconnected - kill them
      removeFromList = true;
      deny = true;
      reason = gf.net.DisconnectReason.TIMEOUT;
    }

    if (removeFromList) {
      if (deny) {
        var disconnectData = gf.net.packets.Disconnect.createData(reason);
        if (disconnectData) {
          socket.write(disconnectData);
        }
        goog.dispose(socket);
      }
      this.joiningSockets_.splice(n, 1);
      n--;
      continue;
    }
  }
};


/**
 * Validates the given user.
 * @private
 * @param {!gf.net.User} user User to validate.
 * @return {boolean} True if the user is valid.
 */
gf.net.ServerSession.prototype.validateUser_ = function(user) {
  // TODO(benvanik): validate permissions/etc
  return true;
};


/**
 * Registers networking handlers.
 * @private
 */
gf.net.ServerSession.prototype.setupNetworking_ = function() {
  this.packetSwitch.register(
      gf.net.packets.Ping.ID,
      this.handlePing_, this);
  this.packetSwitch.register(
      gf.net.packets.UpdateUserInfo.ID,
      this.handleUpdateUserInfo_, this);
  this.packetSwitch.register(
      gf.net.packets.Disconnect.ID,
      this.handleDisconnect_, this);
};


/**
 * Handles ping packets from users.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ServerSession.prototype.handlePing_ = function(packet, packetType,
    reader) {
  var user = packet.user;
  var ping = gf.net.packets.Ping.read(reader);
  if (!ping) {
    return false;
  }

  if (gf.NODE) {
    var realTime = this.clock.getServerTime();
    gf.log.write('[' + user.sessionId + '] ping ',
        ping.serverTime, ping.clientTime,
        realTime, realTime - ping.serverTime / 1000, ping.latency);
  }

  // Update statistics
  user.statistics.updateLatency(Math.abs(ping.latency));

  // Get real server time and send back
  var serverTime = this.clock.getServerTime();
  // TODO(benvanik): remove this garbage
  var userStatistics = new Array(this.users.length);
  for (var n = 0; n < this.users.length; n++) {
    userStatistics[n] = new gf.net.packets.UserStatistics();
    userStatistics[n].wireId = this.users[n].wireId;
    userStatistics[n].latency = this.users[n].statistics.averageLatency;
  }
  this.send(gf.net.packets.Pong.createData(
      (serverTime * 1000) | 0,
      ping.clientTime,
      userStatistics), user);

  return true;
};


/**
 * Handles user update request packets.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ServerSession.prototype.handleUpdateUserInfo_ = function(packet,
    packetType, reader) {
  var updateUserInfo = gf.net.packets.UpdateUserInfo.read(reader);
  if (!updateUserInfo) {
    return false;
  }

  var user = this.getUserBySessionId(updateUserInfo.sessionId);
  if (!user) {
    return true;
  }
  if (user != packet.user) {
    // Can only change self
    // TODO(benvanik): allow admins to force changes
    return false;
  }

  // Update
  this.updateUser(user, updateUserInfo.info);

  // Broadcast update - always send the sanitized version
  this.send(gf.net.packets.UpdateUserInfo.createData(
      user.sessionId,
      user.info));

  return true;
};


/**
 * Handles ping packets from users.
 * @private
 * @param {!gf.net.Packet} packet Packet.
 * @param {number} packetType Packet type ID.
 * @param {!gf.net.PacketReader} reader Packet reader.
 * @return {boolean} True if the packet was handled successfully.
 */
gf.net.ServerSession.prototype.handleDisconnect_ = function(packet, packetType,
    reader) {
  var user = packet.user;
  var disconnect = gf.net.packets.Disconnect.read(reader);
  if (!disconnect) {
    return false;
  }

  gf.log.write('[' + user.sessionId + '] disconnect req',
      disconnect.reason);

  return true;
};


/**
 * Sends data to either a specific user or broadcasts to all users.
 * @param {ArrayBuffer} data Data to write.
 * @param {gf.net.User=} opt_user Target user. Omit for broadcast.
 */
gf.net.ServerSession.prototype.send = function(data, opt_user) {
  if (!data) {
    return;
  }

  if (opt_user) {
    // Targetted send
    var socket = opt_user.socket;
    goog.asserts.assert(socket);
    if (socket.state != gf.net.Socket.State.CLOSED) {
      socket.write(data);
      opt_user.statistics.bytesReceived += data.byteLength;
    } else {
      // Must be dead - disconnect
      this.removeUser_(opt_user);
    }
  } else {
    // Broadcast to all users
    for (var n = 0; n < this.users.length; n++) {
      var user = this.users[n];
      var socket = user.socket;
      goog.asserts.assert(socket);
      if (socket.state != gf.net.Socket.State.CLOSED) {
        user.statistics.bytesReceived += data.byteLength;
        socket.write(data);
      } else {
        // Must be dead - disconnect
        user.disconnectReason = gf.net.DisconnectReason.TIMEOUT;
        this.removeUser_(user);
      }
    }
  }
};
