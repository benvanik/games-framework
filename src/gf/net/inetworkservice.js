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

goog.provide('gf.net.INetworkService');



/**
 * Interface for network services.
 * Provides events about network sessions to interested parties. Implement this
 * interface and call {@see gf.net.Session#registerService} to begin listening.
 * @interface
 */
gf.net.INetworkService = function() {};


/**
 * Handles session connection/ready.
 */
gf.net.INetworkService.prototype.connected;


/**
 * Handles session disconnected/unready.
 */
gf.net.INetworkService.prototype.disconnected;


/**
 * Handles user that has connected.
 * @param {!gf.net.User} user User.
 */
gf.net.INetworkService.prototype.userConnected;


/**
 * Handles users that has disconnected.
 * @param {!gf.net.User} user User.
 */
gf.net.INetworkService.prototype.userDisconnected;


/**
 * Handles users that have updated their information.
 * @param {!gf.net.User} user User.
 */
gf.net.INetworkService.prototype.userUpdated;
