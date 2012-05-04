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

goog.provide('gf.net.UserAgent');

goog.require('gf');
goog.require('goog.userAgent');
goog.require('goog.userAgent.platform');
goog.require('goog.userAgent.product');



/**
 * Network agent information.
 * Can be used to determine the capabilities of a remote agent or report the
 * information to the user.
 *
 * @constructor
 */
gf.net.UserAgent = function() {
  /**
   * Full user-agent type string.
   * @type {string}
   */
  this.userAgentString = '';

  /**
   * Agent type, if recognized.
   * @type {gf.net.UserAgent.Type}
   */
  this.type = gf.net.UserAgent.Type.UNKNOWN;

  /**
   * Platform type, if recognized.
   * @type {gf.net.UserAgent.Platform}
   */
  this.platform = gf.net.UserAgent.Platform.OTHER;

  /**
   * Platform version, if available.
   * @type {string}
   */
  this.platformVersion = '';

  /**
   * Device type of the agent.
   * @type {gf.net.UserAgent.Device}
   */
  this.device = gf.net.UserAgent.Device.DESKTOP;
};


/**
 * Detects agent information on the current device.
 * @return {!gf.net.UserAgent} Agent information.
 */
gf.net.UserAgent.detect = function() {
  var agent = new gf.net.UserAgent();

  agent.userAgentString = goog.userAgent.getUserAgentString() || '';

  // Type
  if (gf.NODE) {
    agent.type = gf.net.UserAgent.Type.NODEJS;
  } else if (goog.userAgent.OPERA) {
    agent.type = gf.net.UserAgent.Type.OPERA;
  } else if (goog.userAgent.IE) {
    agent.type = gf.net.UserAgent.Type.IE;
  } else if (goog.userAgent.GECKO) {
    agent.type = gf.net.UserAgent.Type.GECKO;
  } else if (goog.userAgent.WEBKIT) {
    agent.type = gf.net.UserAgent.Type.WEBKIT;
  } else {
    agent.type = gf.net.UserAgent.Type.UNKNOWN;
  }

  // Platform
  if (goog.userAgent.MAC) {
    agent.platform = gf.net.UserAgent.Platform.MAC;
  } else if (goog.userAgent.WINDOWS) {
    agent.platform = gf.net.UserAgent.Platform.WINDOWS;
  } else if (goog.userAgent.LINUX) {
    agent.platform = gf.net.UserAgent.Platform.LINUX;
  } else {
    agent.platform = gf.net.UserAgent.Platform.OTHER;
  }
  agent.platformVersion = goog.userAgent.platform.VERSION;

  // Device
  if (gf.NODE) {
    agent.device = gf.net.UserAgent.Device.SERVER;
  } else if (goog.userAgent.product.CHROME) {
    agent.device = gf.net.UserAgent.Device.CHROME;
  } else if (goog.userAgent.product.IPHONE) {
    agent.device = gf.net.UserAgent.Device.IPHONE;
  } else if (goog.userAgent.product.IPAD) {
    agent.device = gf.net.UserAgent.Device.IPAD;
  } else if (goog.userAgent.product.ANDROID) {
    agent.device = gf.net.UserAgent.Device.ANDROID;
  } else if (goog.userAgent.MOBILE) {
    agent.device = gf.net.UserAgent.Device.OTHER_MOBILE;
  } else {
    agent.device = gf.net.UserAgent.Device.DESKTOP;
  }

  return agent;
};


/**
 * Deep-clones the object.
 * @return {!gf.net.UserAgent} Cloned object.
 */
gf.net.UserAgent.prototype.clone = function() {
  var clone = new gf.net.UserAgent();
  clone.userAgentString = this.userAgentString;
  clone.type = this.type;
  clone.platform = this.platform;
  clone.platformVersion = this.platformVersion;
  clone.device = this.device;
  return clone;
};


/**
 * Converts the object to a human-readable string.
 * @return {string} Human-readable string representation.
 */
gf.net.UserAgent.prototype.toString = function() {
  return [
    this.type, this.platform + this.platformVersion, this.device
  ].join('/');
};


/**
 * User agent types.
 * @enum {string}
 */
gf.net.UserAgent.Type = {
  UNKNOWN: 'unknown',
  NODEJS: 'nodejs',
  OPERA: 'opera',
  IE: 'ie',
  GECKO: 'gecko',
  WEBKIT: 'webkit'
};


/**
 * Operating system types.
 * @enum {string}
 */
gf.net.UserAgent.Platform = {
  MAC: 'mac',
  WINDOWS: 'windows',
  LINUX: 'linux',
  OTHER: 'other'
};


/**
 * Device types.
 * @enum {string}
 */
gf.net.UserAgent.Device = {
  DESKTOP: 'desktop',
  SERVER: 'server',
  CHROME: 'chrome',
  IPHONE: 'iphone',
  IPAD: 'ipad',
  ANDROID: 'android',
  OTHER_MOBILE: 'mobile'
};
