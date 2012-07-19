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

goog.provide('gf.sim.search.SpatialDatabase');

goog.require('gf.vec.Ray');
goog.require('goog.vec.Vec3');
goog.provide('gf.sim.search.TraceState');



/**
 * Abstract spatial database.
 * Used to store entities in a form that allows for fast and easy lookup.
 *
 * @constructor
 * @param {function(new:gf.sim.search.TraceState)=} opt_traceStateCtor
 *     Constructor for trace state instances. Omit for the default of
 *     {@see gf.sim.search.TraceState}.
 */
gf.sim.search.SpatialDatabase = function(opt_traceStateCtor) {
  /**
   * Trace state type constructor.
   * @private
   * @type {!function(new:gf.sim.search.TraceState)}
   */
  this.traceStateCtor_ = opt_traceStateCtor || gf.sim.search.TraceState;

  /**
   * A pool of unused trace states.
   * @private
   * @type {!Array.<!gf.sim.search.TraceState>}
   */
  this.unusedTraces_ = [];
};


/**
 * Adds an entity to the database.
 * @param {!gf.sim.entities.SpatialEntity} entity Entity to add.
 */
gf.sim.search.SpatialDatabase.prototype.addEntity = goog.abstractMethod;


/**
 * Updates an entity in the database when spatial information changes.
 * @param {!gf.sim.entities.SpatialEntity} entity Entity to update.
 */
gf.sim.search.SpatialDatabase.prototype.updateEntity = goog.abstractMethod;


/**
 * Updates a list of entities in the database when spatial information changes.
 * @param {!Array.<!gf.sim.entities.SpatialEntity>} entities Entities to update.
 */
gf.sim.search.SpatialDatabase.prototype.updateEntities = function(entities) {
  // Subclasses that can do this more efficiently really should...
  for (var n = 0; n < entities.length; n++) {
    this.updateEntity(entities[n]);
  }
};


/**
 * Removes an entity from the database.
 * @param {!gf.sim.entities.SpatialEntity} entity Entity to remove.
 */
gf.sim.search.SpatialDatabase.prototype.removeEntity = goog.abstractMethod;


/**
 * Enumerates all entities in the database.
 * @param {!function(!gf.sim.entities.SpatialEntity):boolean|undefined} callback
 *     Function to call for each entity. Return false to cancel the enumeration.
 * @param {Object=} opt_scope Scope to call the function in.
 */
gf.sim.search.SpatialDatabase.prototype.forEach = goog.abstractMethod;


/**
 * Enumerates all entities in the database that intersect the given viewport.
 * @param {!gf.vec.Viewport} viewport Viewport.
 * @param {!function(!gf.sim.entities.SpatialEntity):boolean|undefined} callback
 *     Function to call for each entity. Return false to cancel the enumeration.
 * @param {Object=} opt_scope Scope to call the function in.
 */
gf.sim.search.SpatialDatabase.prototype.forEachInViewport = goog.abstractMethod;


/**
 * Enumerates all entities in the database that intersect the given entity or
 * bounding sphere.
 * @param {!gf.sim.entities.SpatialEntity|!goog.vec.Vec4.Float32}
 *     entityOrSphere An entity or bounding sphere to test intersection against.
 * @param {!function(!gf.sim.entities.SpatialEntity):boolean|undefined} callback
 *     Function to call for each entity. Return false to cancel the enumeration.
 * @param {Object=} opt_scope Scope to call the function in.
 */
gf.sim.search.SpatialDatabase.prototype.forEachIntersecting =
    goog.abstractMethod;


/**
 * Begins a trace operation by casting a ray through the scene.
 * Trace operations have state and the flow must follow:
 * <code>
 * var trace = db.beginTracing(ray, 0, 100);
 * while (db.nextTraceHit(trace)) {
 *   gf.log.debug('hit entity ' + trace.entity + ' at ' + trace.distance);
 * }
 * db.endTracing(trace);
 * </code>
 *
 * @param {!gf.vec.Ray.Type} ray Normalized ray.
 * @param {number} start Start position on the ray.
 * @param {number} end End position on the ray.
 * @param {number=} opt_radius Radius of the ray, or 0.
 * @param {Function=} opt_typeFilter Type filter; only hit this type.
 * @return {!gf.sim.search.TraceState} Tracing state object.
 */
gf.sim.search.SpatialDatabase.prototype.beginTracing = function(
    ray, start, end, opt_radius, opt_typeFilter) {
  // Allocate or grab from pool
  var trace = this.unusedTraces_.length ?
      this.unusedTraces_.pop() : new this.traceStateCtor_();

  // Set variables
  gf.vec.Ray.setFromArray(trace.ray, ray);
  trace.start = start;
  trace.end = end;
  trace.radius = opt_radius || 0;
  trace.typeFilter = opt_typeFilter || null;

  // NOTE: if radius > 0: add radius to each bounding sphere radius tested

  return trace;
};


/**
 * Finds the next hit along the trace operation.
 * If no hit is found, false is returned and the operation should be ended with
 * {@see #endTracing}.
 * @param {!gf.sim.search.TraceState} trace Tracing state object.
 * @return {boolean} True if a hit was found.
 */
gf.sim.search.SpatialDatabase.prototype.nextTraceHit = goog.abstractMethod;


/**
 * Ends a tracing operation.
 * This must be called after beginning a trace to cleanup state.
 * @param {!gf.sim.search.TraceState} trace Tracing state object.
 */
gf.sim.search.SpatialDatabase.prototype.endTracing = function(trace) {
  // Return to pool, but null out the entity so we don't leak it
  trace.entity = null;
  this.unusedTraces_.push(trace);
};



/**
 * A reusable object for performing spatial traces.
 * Search databases can subclass this type to store intermediate information
 * about a trace.
 *
 * @constructor
 */
gf.sim.search.TraceState = function() {
  /**
   * Normalized ray.
   * @type {!gf.vec.Ray.Type}
   */
  this.ray = gf.vec.Ray.create();

  /**
   * Radius of the ray.
   * This can be 0 for a normal ray, or > 0 to sweep a sphere.
   * @type {number}
   */
  this.radius = 0;

  /**
   * Point on the ray to start tracing.
   * @type {number}
   */
  this.start = 0;

  /**
   * Point on the ray to stop tracing.
   * @type {number}
   */
  this.end = 0;

  /**
   * Type filter.
   * Any entity type that is not an instance of this will be ignored.
   * @type {Function}
   */
  this.typeFilter = null;

  /**
   * Last hit entity, if any.
   * @type {gf.sim.entities.SpatialEntity}
   */
  this.entity = null;

  /**
   * The point in world space where the trace intersected the entity.
   * @type {!goog.vec.Vec3.Float32}
   */
  this.point = goog.vec.Vec3.createFloat32();

  /**
   * The distance on the ray at which the intersection occurred.
   * @type {number}
   */
  this.distance = 0;
};
