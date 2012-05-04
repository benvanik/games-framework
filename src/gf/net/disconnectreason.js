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

goog.provide('gf.net.DisconnectReason');


/**
 * The reason a user was disconnected.
 * @enum {number}
 */
gf.net.DisconnectReason = {
  /**
   * User disconnected cleanly.
   */
  USER: 0,

  /**
   * Timed out/disconnected uncleanly.
   */
  TIMEOUT: 1,

  /**
   * Either the system or application protocol versions don't match.
   */
  PROTOCOL_MISMATCH: 2,

  /**
   * Unexpected data from the client - either malformed or out-of-sequence
   * packets.
   */
  UNEXPECTED_DATA: 3,

  /**
   * User could not be validated.
   */
  ACCESS_DENIED: 4,

  /**
   * Kicked by an admin.
   */
  KICKED: 5,

  /**
   * Banned by an admin.
   */
  BANNED: 6
};


/**
 * Converts a disconnect reason to a human-readable string.
 * @param {gf.net.DisconnectReason} value Disconnect reason.
 * @return {string} Human-readable string.
 */
gf.net.DisconnectReason.toString = function(value) {
  switch (value) {
    case gf.net.DisconnectReason.USER:
      return 'user closed the connection';
    case gf.net.DisconnectReason.TIMEOUT:
      return 'socket killed or timed out';
    case gf.net.DisconnectReason.PROTOCOL_MISMATCH:
      return 'network protocol mismatch';
    case gf.net.DisconnectReason.UNEXPECTED_DATA:
      return 'unexpected data sent/received';
    case gf.net.DisconnectReason.ACCESS_DENIED:
      return 'access denied';
    case gf.net.DisconnectReason.KICKED:
      return 'kicked by console';
    case gf.net.DisconnectReason.BANNED:
      return 'banned';
    default:
      return 'unknown';
  }
};
