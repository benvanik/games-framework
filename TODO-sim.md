gf.sim


* entity sync priority: higher the priority, more frequently synced
* entity relevance:
  - each sim.Observer has view info, ServerSim manages relevant entities
  - Entity has a check, as entities/observers move checks are re-performed
  - events on Observer: createEntity/updateEntity/deleteEntity

Observer??:
  view info
  entities[]: only relevant ones
  entitiesUpdated[]
  queueEntitiyUpdate(entity)
  flush():
    // could coalesce create/update/delete, if it mattered
    build and send SyncEntities packet w/ relevant entities:
      switch on entity.dirtyFlag (created|updated|deleted)

Scheduler:
  upcomingEntities: sorted list of scheduled entities / buckets / w/e
  update(frame)

Simulator:
  entityTypes{}: ID -> class
  registerEntityFactory(typeId, type)

  ServerSimulator:
    netService
    entities[]: all active

    createEntity(typeId, opt_temporary)
    getEntity(id)
    forEachEntity(...)
    removeEntity(id|entity)

    dirtiedEntities[]: all dirtied
    notifyEntityDirty(entity)
    processDirtyEntities():
      f.e. dirty entitiy:
        if relevance changed:
          reset observer list
          f.e. observer: check relevance, add to list
        f.e. entity.observers: queueEntityUpdate(e)

    registerCommandHandler(typeId, callback, opt_scope)
    sendCommand(command, opt_user)

    update(frame) + other hooks?
      poll incoming packets/commands/etc
      processDirtyEntities()
      f.e. observer: flush()

  ClientSimulator:
    netService
    entities[]: all known

    createEntity_(typeId)
    getEntity(id)

    registerCommandHandler(typeId, callback, opt_scope)
    sendCommand(command)

    update(frame) + other hooks? (prediction/input/etc)

Command: (client/server)
  typeId
  read(packetReader)
  write(packetWriter)
  MyCommand:
    impls of read/write - use msg format for packets
    e.g., kill message

ServerEntity:
  getState()
  owner = user
  parent
  flags:
    - updates-frequently: optimized for updating every tick
    - physics: runs through the physics loop
    - server-only: never send to clients
    - transient: server may create on clients, but will never update again
    - latency-compensated: whether the entity is setup for latency compensation
  dirtyFlag = bitmask of created | updated | deleted
  lastUpdateTime_
  nextUpdateTime_ (estimated)
  update(time, timeDelta)
  prot scheduleUpdate(time)
  prot notifyDirty(): this.sim.notifyEntityDirty(this)
  MyServerEntity:
    state = new MyServerEntityState() // + prediction/rewinding/etc

ClientEntity:
  getState()
  parent
  update(frame)
  render(frame)
  MyClientEntity:
    state = new MyClientEntityState() // + interpolation/prediction

IMyEntity:
  shared stuff interface
MySharedEntity:
  static methods, act on IMyEntity
EntityState:
  MyEntityState: (manual)
    getVar() / setVar()
    MyServerEntityState: (generated)
    MyClientEntityState: (generated)

Client|ServerEntity:
  StateEntity:
    GlobalStateEntity
    PlayerStateEntity
    InvetoryEntity
  EventEntity:
    AmbientSoundEntity
  WorldEntity: (pos/vel/etc)
    PositionalSoundEntity
    ActorEntity: (has controller)
      LivingEntity
    TriggerEntity:
      ButtonEntity
      TriggerRegionEntity
    ParticleEmitterEntity:
      FireEntity
    ProjectileEntity:
      RocketEntity
    WeaponEntity:
      RocketLauncherEntity

Command:
  sequence #
  sim time generated
  time delta covered (since last command)
  target entity id (or -1)
  havePredicted (true if was predicted already) -- client only

Command:
  PredictedCommand:
    PlayerMoveCommand
      - view rotation (NORMALIZED_QUATERNION)
      - translation bitmask (byte)
      - actions bitmask (uint)
  ChangeSkinCommand


Network packets:
  - SyncSimulation {s->c}
    - varint sequence #, counts for each type
    - creates[]:
      - varint entity id
      - flags:
        - temporary
        - ??
      - [full data]
    - updates[]:
      - varint entity id
      - [delta data]
    - deletes[]:
      - varint entity id
    - commands[]:
      - varint typeId
      - [data]
  - ExecCommands {c->s}
    - varint count
    - commands[]:
      - varint typeId
      - [data]


EntityState:
  - entity
  - ctor:
    someVarOrdinal_ = declareVariable(setSomeVar)
  - f.e. var:
    - someVar_
    - someVarOrdinal_
    - getSomeVar(): return someVar_
    - setSomeVar(v):
        if (!eq(someVar_, v)) {
          set(someVar_, v);
          flagDirtyVar(someVarOrdinal_);
          this.entity.invalidate();
        }
  - read()
  - readDelta()
  - write()
  - writeDelta()

http://jsperf.com/ifs-vs-table <-- use tables


Entity:
  state = current state
  parent

ClientEntity:
  confirmedState = last confirmed state from the server [client only]
  previousStates[] = previous states, used for interpolation [client only]
  renderState = interpolated/predicted state, may point at state if neither enabled

ServerEntity:



gf.sim.entities.SpatialEntity:
- position
- orientation
- boundingRadius


gf.sim.entities.SceneEntity:
- spatialChildren_
- spatialDatabase_
- thunks to spatial database:
  - forEachChildInViewport(viewport)
  - forEachChildInNear(e | point, maxDistance)
  - forEachChildIntersecting(e | point)
  - forEachChildIntersected(ray, maxDistance)
  - findClosestChild(e | point, maxDistance)
  - trace(ray, start, end)

gf.sim.db.ISpatialDatabase:
- addEntity(e)
- updateEntity(e)
- updateEntities(e[])
- removeEntity(e)
- forEachChildInViewport(viewport)
- forEachChildInNear(e | point, maxDistance)
- forEachChildIntersecting(e | point)
- forEachChildIntersected(ray, maxDistance)
- findClosestChild(e | point, maxDistance)
- trace(ray, start, end)

gf.sim.db.ListDatabase
gf.sim.db.QuadtreeDatabase
gf.sim.db.OctreeDatabase
gf.sim.db.KdTreeDatabase

MapEntity <- SceneEntity
- custom spatial database
