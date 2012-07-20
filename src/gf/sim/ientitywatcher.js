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

goog.provide('gf.sim.IEntityWatcher');



/**
 * Entity watcher interface.
 * Entity watchers get notified when entities change in the simulation. They
 * must be registered with {@see gf.sim.Simulator#addWatcher}.
 *
 * @interface
 */
gf.sim.IEntityWatcher = function() {};


/**
 * Handles entities after they have been added to the simulation.
 * Note that the entity properties may not have been initialized yet.
 * @param {!gf.sim.Entity} entity Entity that was added.
 */
gf.sim.IEntityWatcher.prototype.entityAdded;


/**
 * Handles entities after they have been removed from the simulation.
 * @param {!gf.sim.Entity} entity Entity that was removed.
 */
gf.sim.IEntityWatcher.prototype.entityRemoved;
