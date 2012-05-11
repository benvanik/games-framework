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

goog.provide('gf.net.UserInfo');

goog.require('gf.net.AuthType');
goog.require('goog.string');



/**
 * User information.
 * Contains generally immutable user information, such as identification and
 * authentication values.
 *
 * @constructor
 */
gf.net.UserInfo = function() {
  /**
   * Authentication type.
   * @type {gf.net.AuthType}
   */
  this.authType = gf.net.AuthType.NONE;

  /**
   * Authentication service-specific ID, such as FBID.
   * @type {string}
   */
  this.authId = '0';

  /**
   * Displayed name of the user.
   * @type {string}
   */
  this.displayName = 'User';
};


/**
 * Deep-clones the object.
 * @return {!gf.net.UserInfo} Cloned object.
 */
gf.net.UserInfo.prototype.clone = function() {
  var clone = new gf.net.UserInfo();
  clone.authType = this.authType;
  clone.authId = this.authId;
  clone.displayName = this.displayName;
  return clone;
};


/**
 * Converts the object to a human-readable string.
 * @return {string} Human-readable string representation.
 */
gf.net.UserInfo.prototype.toString = function() {
  return '[user]';
};


/**
 * Sanitizes an input user name.
 * @param {string} value User name.
 * @return {string} Sanitized user name.
 */
gf.net.UserInfo.sanitizeDisplayName = function(value) {
  value = goog.string.normalizeSpaces(goog.string.normalizeWhitespace(
      goog.string.trim(value)));
  if (!value.length) {
    return 'User';
  }
  return value;
};
