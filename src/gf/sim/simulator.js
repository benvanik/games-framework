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

goog.provide('gf.sim.Simulator');

goog.require('gf.Component');
goog.require('gf.log');
goog.require('gf.sim');
goog.require('gf.sim.EntityDirtyFlag');
goog.require('gf.sim.PredictedCommand');
goog.require('gf.sim.Scheduler');
goog.require('gf.sim.commands');
goog.require('goog.asserts');



/**
 * Abstract simulator class.
 * Use the {@see gf.sim.ClientSimulator} and {@see gf.sim.ServerSimulator}
 * subclasses instead of this.
 *
 * The simulator handles synchronized state updates across client/server.
 * The core unit of simulation is an entity, which is (often) replicated across
 * a server and interested clients. Entities can be any kind of object, from
 * game rules and sound emitters to 3D meshes and player controllers. Each
 * entity has variables that can be replicated in a reliable fashion as well
 * as interpolated and predicted.
 *
 * @constructor
 * @extends {gf.Component}
 * @param {!gf.Runtime} runtime Runtime instance.
 * @param {number} baseEntityId Base entity ID; 1 for clients, 2 for servers.
 */
gf.sim.Simulator = function(runtime, baseEntityId) {
  goog.base(this, runtime);

  /**
   * Event scheduler.
   * @private
   * @type {!gf.sim.Scheduler}
   */
  this.scheduler_ = new gf.sim.Scheduler(runtime);
  this.registerDisposable(this.scheduler_);

  /**
   * Command type factories mapped by type ID.
   * @private
   * @type {!Object.<number, !gf.sim.CommandFactory>}
   */
  this.commandFactories_ = {};

  /**
   * Entity type factories mapped by type ID.
   * @private
   * @type {!Object.<number, !gf.sim.EntityFactory>}
   */
  this.entityFactories_ = {};

  /**
   * Next entity ID to give out to requesters.
   * Always incremented by two to preserve the baseEntityId LSB.
   * This ensures clients get LSB=1, servers get LSB=0.
   * @private
   * @type {number}
   */
  this.nextEntityId_ = baseEntityId;

  // TODO(benvanik): potentially move this to some kind of hierarchy
  /**
   * All entities the simulator knows about.
   * On the server this is all entities. On the client this is only those
   * entities the server has chosen to replicate with it or have been predicted
   * by the client.
   * @private
   * @type {!Object.<number, !gf.sim.Entity>}
   */
  this.entities_ = {};

  /**
   * Dirty entities list.
   * The list is not reallocated each frame and the length should not be
   * trusted - instead, use {@see dirtyEntitiesLength_}.
   * @private
   * @type {!Array.<gf.sim.Entity>}
   */
  this.dirtyEntities_ = new Array(128);

  /**
   * Current length of the {@see #dirtyEntities_} list.
   * @private
   * @type {number}
   */
  this.dirtyEntitiesLength_ = 0;

  gf.sim.commands.registerCommands(this);
};
goog.inherits(gf.sim.Simulator, gf.Component);


/**
 * Gets the simulation event scheduler.
 * @return {!gf.sim.Scheduler} Scheduler.
 */
gf.sim.Simulator.prototype.getScheduler = function() {
  return this.scheduler_;
};


/**
 * Registers an command type factory with the simulator.
 * This should be done on startup to ensure all commands are properly found.
 * @param {!gf.sim.CommandFactory} commandFactory An command type factory.
 */
gf.sim.Simulator.prototype.registerCommandFactory = function(commandFactory) {
  goog.asserts.assert(!this.commandFactories_[commandFactory.typeId]);
  this.commandFactories_[commandFactory.typeId] = commandFactory;
};


/**
 * Gets the command type factory with the given type ID, if it is found.
 * @param {number} typeId Command type ID.
 * @return {gf.sim.CommandFactory} An command type factory with the given ID.
 */
gf.sim.Simulator.prototype.getCommandFactory = function(typeId) {
  return this.commandFactories_[typeId] || null;
};


/**
 * Registers an entity type factory with the simulator.
 * This should be done on startup to ensure all entities are properly found.
 * @param {!gf.sim.EntityFactory} entityFactory An entity type factory.
 */
gf.sim.Simulator.prototype.registerEntityFactory = function(entityFactory) {
  goog.asserts.assert(!this.entityFactories_[entityFactory.typeId]);
  this.entityFactories_[entityFactory.typeId] = entityFactory;
};


/**
 * Gets the entity type factory with the given type ID, if it is found.
 * @param {number} typeId Entity type ID.
 * @return {gf.sim.EntityFactory} An entity type factory with the given ID.
 */
gf.sim.Simulator.prototype.getEntityFactory = function(typeId) {
  return this.entityFactories_[typeId] || null;
};


/**
 * Allocates a new entity ID.
 * @return {number} An entity ID.
 */
gf.sim.Simulator.prototype.allocateEntityId = function() {
  // TODO(benvanik): assert no overflow
  // Increment by two to preserve LSB
  var entityId = this.nextEntityId_;
  this.nextEntityId_ += 2;
  return entityId;
};


/**
 * Creates a new entity of the given type.
 * The entity will be added to the simulation.
 * @param {number} typeId Entity type ID.
 * @param {number} entityFlags Bitmask of {@see gf.sim.EntityFlag}.
 * @return {!gf.sim.Entity} A new entity.
 */
gf.sim.Simulator.prototype.createEntity = function(typeId, entityFlags) {
  var entityFactory = this.entityFactories_[typeId];
  goog.asserts.assert(entityFactory);
  var entity = entityFactory.createEntity(
      this, this.allocateEntityId(), entityFlags);
  this.addEntity(entity);
  return entity;
};


/**
 * Adds the given entity to the simulation.
 * Depending on the entity type it will be scheduled for replication to clients
 * and tracked for future updates.
 * @protected
 * @param {!gf.sim.Entity} entity Entity to add.
 */
gf.sim.Simulator.prototype.addEntity = function(entity) {
  goog.asserts.assert(!(entity.dirtyFlags & gf.sim.EntityDirtyFlag.CREATED));

  // Stash in entity set
  var id = entity.getId();
  goog.asserts.assert(!this.entities_[id]);
  this.entities_[id] = entity;

  // Add to the dirty tracking list
  entity.dirtyFlags |= gf.sim.EntityDirtyFlag.CREATED;
  this.invalidateEntity(entity);
};


/**
 * Gets the entity with the given ID.
 * @param {number} entityId Entity ID.
 * @return {gf.sim.Entity} Entity with the given ID, if found.
 */
gf.sim.Simulator.prototype.getEntity = function(entityId) {
  return this.entities_[entityId] || null;
};


/**
 * Enumerates the list of entities calling a function for each present.
 * @param {!function(!gf.sim.Entity):undefined} callback Callback function
 *     that is called once per entity.
 * @param {Object=} opt_scope Scope to call the function in.
 */
gf.sim.Simulator.prototype.forEachEntity = function(callback, opt_scope) {
  for (var entityId in this.entities_) {
    var entity = this.entities_[Number(entityId)];
    callback.call(opt_scope || goog.global, entity);
  }
};


/**
 * Marks an entity as invalidated and needing a scheduled update.
 * Only call when the entity has newly been dirtied.
 * This will only be called once per tick by each entity on the first time it
 * becomes dirty.
 * @param {!gf.sim.Entity} entity Entity to mark as invalidated.
 */
gf.sim.Simulator.prototype.invalidateEntity = function(entity) {
  // NOTE: assumes that this is only called when needed
  this.dirtyEntities_[this.dirtyEntitiesLength_++] = entity;
};


/**
 * Removes the given entity from the simulation.
 * Depending on the entity type it will be scheduled for deletion from clients.
 * @param {!gf.sim.Entity} entity Entity to remove.
 */
gf.sim.Simulator.prototype.removeEntity = function(entity) {
  goog.asserts.assert(!(entity.dirtyFlags & gf.sim.EntityDirtyFlag.DELETED));

  // Remove from entity set
  var id = entity.getId();
  goog.asserts.assert(this.entities_[id]);
  delete this.entities_[id];

  // Add to the dirty tracking list
  var wasDirty = !!entity.dirtyFlags;
  entity.dirtyFlags |= gf.sim.EntityDirtyFlag.DELETED;
  if (!wasDirty) {
    this.invalidateEntity(entity);
  }
};


/**
 * Updates the simulator, processing one host tick.
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.Simulator.prototype.update = goog.abstractMethod;


/**
 * Executes incoming or pending commands.
 * @param {!Array.<!gf.sim.Command>} commands Commands to execute.
 * @param {number} commandCount Count of commands to execute.
 */
gf.sim.Simulator.prototype.executeCommands = function(commands, commandCount) {
  for (var n = 0; n < commandCount; n++) {
    var command = commands[n];

    // Get the target entity (if any)
    var entityId = command.targetEntityId;
    if (entityId == gf.sim.NO_ENTITY_ID) {
      // Global command
      this.executeCommand(command);
    } else {
      // Entity-specific command - dispatch
      var entity = this.getEntity(entityId);
      if (entity) {
        entity.executeCommand(command);
      } else {
        // TODO(benvanik): error if bad entity ID?
        gf.log.debug('command ' + command.sequence + ': no entity ' + entityId);
      }
    }

    // Mark the command as predicted so that it doesn't re-duplicate logic
    if (command instanceof gf.sim.PredictedCommand) {
      command.hasPredicted = true;
    }
  }
};


/**
 * Executes a single global command.
 *
 * On the server this is called once per command as it arrives over the network.
 *
 * On the client this may be called multiple times for predicted commands
 * (those that derive from {@see gf.sim.PredictedCommand}. The first call will
 * have the {@see gf.sim.PredictedCommand#hasPredicted} flag set false and all
 * subsequent calls will have it set to true.
 *
 * @protected
 * @param {!gf.sim.Command} command Command to execute.
 */
gf.sim.Simulator.prototype.executeCommand = goog.nullFunction;


/**
 * Calls {@see gf.sim.Entity#postTickUpdate} on all entities that were updated
 * this tick. The entities states are not reset.
 * @protected
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.Simulator.prototype.postTickUpdateEntities = function(frame) {
  for (var n = 0; n < this.dirtyEntitiesLength_; n++) {
    var entity = this.dirtyEntities_[n];
    goog.asserts.assert(entity);

    // Run per-frame change entity logic
    entity.postTickUpdate(frame);

    // Run custom simulator code on the entity
    // This may send commands, network sync packets, etc
    this.postTickUpdateEntity(frame, entity);
  }
};


/**
 * Handles per-entity post update logic.
 * When this is called the entity has already had
 * {@see gf.sim.Entity#postTickUpdate} called on it. After this function
 * is called the entity will have its dirty state reset.
 * @protected
 * @param {!gf.UpdateFrame} frame Current update frame.
 * @param {!gf.sim.Entity} entity Entity that was updated.
 */
gf.sim.Simulator.prototype.postTickUpdateEntity = goog.nullFunction;


/**
 * Runs after all tick actions are done and state can be flushed/reset.
 * @protected
 * @param {!gf.UpdateFrame} frame Current update frame.
 */
gf.sim.Simulator.prototype.postUpdate = function(frame) {
  // Clean up the dirty entity list and reset state
  for (var n = 0; n < this.dirtyEntitiesLength_; n++) {
    var entity = this.dirtyEntities_[n];
    goog.asserts.assert(entity);
    this.dirtyEntities_[n] = null;

    // Reset entity state
    entity.resetDirtyState();
  }
  this.dirtyEntitiesLength_ = 0;
};
