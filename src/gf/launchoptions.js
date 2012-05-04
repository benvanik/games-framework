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

/**
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.LaunchOptions');

goog.require('goog.Uri');
goog.require('goog.asserts');



/**
 * Launch options utility.
 * Will parse out the given URI and provides helpers that subclasses can use to
 * more easily access the information.
 *
 * @constructor
 * @param {string} uri Source app URI string.
 */
gf.LaunchOptions = function(uri) {
  /**
   * Launch page URI.
   * @type {!goog.Uri}
   */
  this.uri = new goog.Uri(uri);

  var queryData = this.uri.getQueryData();
  goog.asserts.assert(queryData);

  /**
   * URI query data.
   * @type {!goog.Uri.QueryData}
   */
  this.queryData = queryData;

  /**
   * Build server daemon, if running dynamic mode.
   * @type {string?}
   */
  this.buildServer = this.getString('buildServer', null);
};


/**
 * Gets a number value.
 * @param {string} name String name.
 * @param {number?} defaultValue Default string value.
 * @return {number?} String value.
 */
gf.LaunchOptions.prototype.getNumber = function(name, defaultValue) {
  var value = this.queryData.get(name, defaultValue);
  if (!goog.isDef(value) || !value || !value.length) {
    return defaultValue;
  }
  return Number(value);
};


/**
 * Gets a string value.
 * @param {string} name String name.
 * @param {string?} defaultValue Default string value.
 * @return {string?} String value.
 */
gf.LaunchOptions.prototype.getString = function(name, defaultValue) {
  var value = this.queryData.get(name, defaultValue);
  if (!goog.isDef(value) || !value || !value.length) {
    return defaultValue;
  }
  return String(value);
};


/**
 * Gets a boolean flag value.
 * @param {string} name Flag name.
 * @param {boolean} defaultValue Default flag value.
 * @return {boolean} Flag value.
 */
gf.LaunchOptions.prototype.getFlag = function(name, defaultValue) {
  var value = this.queryData.get(name, defaultValue);
  switch (value) {
    case undefined:
    case '':
      return defaultValue;
    case 0:
    case '0':
    case false:
    case 'false':
      return false;
    default:
      return true;
  }
};
