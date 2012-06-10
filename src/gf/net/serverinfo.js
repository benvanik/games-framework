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

goog.provide('gf.net.ServerInfo');

goog.require('goog.object');



/**
 * Server information.
 * Contains static metadata about a server that can be registered with the
 * browser and used for discovery.
 *
 * @constructor
 */
gf.net.ServerInfo = function() {
  /**
   * Game type identifier.
   * @type {string}
   */
  this.gameType = 'unknown';

  /**
   * Game version string.
   * @type {string}
   */
  this.gameVersion = '0';

  /**
   * Location of the server (lower-case ISO 3166-1 alpha-2 country code).
   * @type {string}
   */
  this.location = 'us';

  /**
   * The maximum number of users allowed on the server.
   * @type {number}
   */
  this.maximumUsers = 32;

  /**
   * Game properties.
   * @type {!Object.<string>}
   */
  this.properties = {};
};


/**
 * Parses server information from a JSON blob.
 * @param {Object|undefined} json JSON object.
 * @return {gf.net.ServerInfo} Server information, if it could be parsed.
 */
gf.net.ServerInfo.fromJson = function(json) {
  if (!json || !goog.isObject(json)) {
    return null;
  }

  // TODO(benvanik): more validation
  var serverInfo = new gf.net.ServerInfo();
  serverInfo.gameType = json['gameType'];
  serverInfo.gameVersion = json['gameVersion'];
  serverInfo.location = json['location'];
  serverInfo.maximumUsers = json['maximumUsers'];
  serverInfo.properties = json['properties'];
  return serverInfo;
};


/**
 * Deep-clones the object.
 * @return {!gf.net.ServerInfo} Cloned object.
 */
gf.net.ServerInfo.prototype.clone = function() {
  var clone = new gf.net.ServerInfo();
  clone.gameType = this.gameType;
  clone.gameVersion = this.gameVersion;
  clone.location = this.location;
  clone.maximumUsers = this.maximumUsers;
  clone.properties = /** @type {!Object.<string>} */ (
      goog.object.clone(this.properties));
  return clone;
};


/**
 * Converts the object to a human-readable string.
 * @return {string} Human-readable string representation.
 */
gf.net.ServerInfo.prototype.toString = function() {
  // TODO(benvanik): toString
  return '[server]';
};
