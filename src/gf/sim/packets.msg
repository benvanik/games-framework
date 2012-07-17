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

namespace gf.sim.packets;


/**
 * NOTE: if these packets change the gf.net.packets.PROTOCOL_VERSION must be
 *       updated too
 *
 * This file slices off packet types 30-39 of the system reserved IDs.
 */


/**
 * Sent from server to client each tick.
 */
message SyncSimulation = 30 {
  // Opaque
};


/**
 * Sent from client to server with a batch of commands.
 */
message ExecCommands = 31 {
  // Opaque
};
