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

goog.provide('gf.net.chat.Event');



/**
 * An event in the history of the channel.
 * Note that because event instances can be long-lived, no big types (such as
 * users) are retained.
 *
 * @constructor
 * @param {!gf.net.chat.Channel} channel Channel this event occurred in.
 * @param {gf.net.chat.EventType} type Event type.
 * @param {string} userId User session ID this event pertains to.
 * @param {string} userName User display name.
 * @param {number} timestamp UNIX timestamp.
 * @param {string=} opt_value Event value.
 */
gf.net.chat.Event = function(channel, type, userId, userName, timestamp,
    opt_value) {
  /**
   * Channel this event occurred in.
   * @type {!gf.net.chat.Channel}
   */
  this.channel = channel;

  /**
   * Event type.
   * @type {gf.net.chat.EventType}
   */
  this.type = type;

  /**
   * User session ID this event came from.
   * @type {string}
   */
  this.userId = userId;

  /**
   * User display name.
   * @type {string}
   */
  this.userName = userName;

  /**
   * UNIX time the event occurred at.
   * @type {number}
   */
  this.timestamp = timestamp;

  /**
   * Event value.
   * @type {?string}
   */
  this.value = opt_value || null;
};
