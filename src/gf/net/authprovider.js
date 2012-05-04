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

goog.provide('gf.net.AuthProvider');

goog.require('gf.net.AuthType');
goog.require('goog.Disposable');



/**
 * Authentication services provider.
 * This type can be subclassed to provide support for alternate authentication
 * schemes. If it is used as-is then no authentication will be performed.
 *
 * @constructor
 * @extends {goog.Disposable}
 */
gf.net.AuthProvider = function() {
  goog.base(this);

  /**
   * The authentication type this provider supports.
   * @type {gf.net.AuthType}
   */
  this.type = gf.net.AuthType.NONE;
};
goog.inherits(gf.net.AuthProvider, goog.Disposable);
