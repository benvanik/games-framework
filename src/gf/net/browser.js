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

goog.provide('gf.net.Browser');

goog.require('goog.Disposable');



/**
 * Server browser client.
 * Can be used client-side to discover servers or by servers to register and
 * maintain their status in the database.
 *
 * @constructor
 * @extends {goog.Disposable}
 */
gf.net.Browser = function() {
  goog.base(this);
};
goog.inherits(gf.net.Browser, goog.Disposable);


/**
 *
 */
gf.net.Browser.prototype.registerServer = function() {
  // TODO(benvanik): registerServer
};


/**
 *
 */
gf.net.Browser.prototype.unregisterServer = function() {
  // TODO(benvanik): unregisterServer
};


/**
 *
 */
gf.net.Browser.prototype.updateServer = function() {
  // TODO(benvanik): updateServer
};


/**
 *
 */
gf.net.Browser.prototype.query = function() {
  // TODO(benvanik): query
  // query args:
  // - game type
  // - game version
  // - has friends
  // - has users / not full
  // - location
  // - custom properties
};
