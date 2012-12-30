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
goog.require('goog.object');
goog.require('goog.string');



/**
 * Launch options utility.
 * Will parse out the given URI and provides helpers that subclasses can use to
 * more easily access the information. Key lookup is case-insensitive.
 *
 * @constructor
 * @param {!Object.<!gf.LaunchOptions.ArgumentInfo>} argumentInfo Argument
 *     information from subclasses.
 * @param {string} uri Source app URI string.
 * @param {Object.<*>=} opt_args Key-value argument map.
 */
gf.LaunchOptions = function(argumentInfo, uri, opt_args) {
  /**
   * Argument information, used for default lookup/help printing/etc.
   * @type {!Object.<!gf.LaunchOptions.ArgumentInfo>}
   */
  this.argumentInfo = argumentInfo;
  goog.object.extend(this.argumentInfo, gf.LaunchOptions.getArgumentInfo());

  /**
   * Launch page URI.
   * @type {!goog.Uri}
   */
  this.uri = new goog.Uri(uri);

  /**
   * Argument query data.
   * @type {!goog.Uri.QueryData}
   */
  this.queryData = new goog.Uri.QueryData(undefined, undefined, true);

  // Add URI query data
  var uriQueryData = this.uri.getQueryData();
  if (uriQueryData) {
    this.queryData.extend(uriQueryData);
  }

  // Add given key/values
  this.queryData.extend(opt_args);

  /**
   * Build server daemon, if running dynamic mode.
   * @type {string?}
   */
  this.buildServer = this.getString('buildServer');
};


/**
 * Argument type.
 * @typedef {boolean|number|string|null}
 */
gf.LaunchOptions.ArgumentType;


/**
 * Argument information.
 * @typedef {{
 *   help: string,
 *   type: !Object,
 *   defaultValue: gf.LaunchOptions.ArgumentType
 * }}
 */
gf.LaunchOptions.ArgumentInfo;


/**
 * Gets argument information for the default launch option arguments.
 * @return {!Object.<!gf.LaunchOptions.ArgumentInfo>} Argument information.
 */
gf.LaunchOptions.getArgumentInfo = function() {
  return {
    'buildServer': {
      'help': 'Build server daemon address.',
      'type': String,
      'defaultValue': null
    }
  };
};


/**
 * Gets the default value of the given argument.
 * @param {string} name Argument name.
 * @return {gf.LaunchOptions.ArgumentType} Default value.
 */
gf.LaunchOptions.prototype.getDefaultValue = function(name) {
  var value = this.argumentInfo[name];
  goog.asserts.assert(goog.isDef(value));
  return value['defaultValue'];
};


/**
 * Gets a number value.
 * @param {string} name Number name.
 * @return {number?} Number value.
 */
gf.LaunchOptions.prototype.getNumber = function(name) {
  var defaultValue = /** @type {number} */ (this.getDefaultValue(name));
  var value = this.queryData.get(name, defaultValue);
  if (!goog.isDef(value) || !value || !value.length) {
    return defaultValue;
  }
  return Number(value);
};


/**
 * Gets a number value, ensuring it is not null.
 * @param {string} name Number name.
 * @return {number} Number value.
 */
gf.LaunchOptions.prototype.getNumberAlways = function(name) {
  var value = this.getNumber(name);
  goog.asserts.assert(goog.isDef(value) && value !== null);
  return value;
};


/**
 * Gets a string value.
 * @param {string} name String name.
 * @return {string?} String value.
 */
gf.LaunchOptions.prototype.getString = function(name) {
  var defaultValue = /** @type {string} */ (this.getDefaultValue(name));
  var value = this.queryData.get(name, defaultValue);
  if (!goog.isDef(value) ||
      !value ||
      !value.length ||
      goog.string.isEmpty(String(value))) {
    return defaultValue;
  }
  return String(value);
};


/**
 * Gets a string value, ensuring it is not empty or null.
 * @param {string} name String name.
 * @return {string} String value.
 */
gf.LaunchOptions.prototype.getStringAlways = function(name) {
  var value = this.getString(name);
  goog.asserts.assert(goog.isDef(value) && value !== null);
  return value;
};


/**
 * Gets a boolean flag value.
 * @param {string} name Flag name.
 * @return {boolean} Flag value.
 */
gf.LaunchOptions.prototype.getFlag = function(name) {
  var defaultValue = /** @type {boolean} */ (this.getDefaultValue(name));
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


/**
 * Parses a list of command line arguments and builds a key-value map
 * that can be provided to a {@see gf.LaunchOptions} instance.
 * This looks for arguments in the form of --key and --key=value.
 *
 * @param {!Array.<string>} args Command line arguments.
 * @return {!Object.<*>} Key-value map.
 */
gf.LaunchOptions.parseCommandLine = function(args) {
  var result = {};
  for (var n = 0; n < args.length; n++) {
    var arg = args[n];
    if (arg.indexOf('--') != 0) {
      continue;
    }
    var parts = arg.split('=');
    var key = parts[0].substring(2);
    var value = parts[1];
    if (parts.length > 1) {
      result[key] = value;
    } else {
      result[key] = true;
    }
  }
  return result;
};
