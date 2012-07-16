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
  registerEntityType(typeId, type)

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



make observer target client specific (add user/etc)


SyncPacket:
  uint4



Network packets:
  - SyncEntities {s->c}
    - [sim shared data] <- sequence #, etc
    - creates[]:
      - entity id
      - flags:
        - temporary
      - [full data]
    - updates[]:
      - entity id
      - [delta data]
    - deletes[]:
      - entity id
  - SendCommands {c->s}
    - commands[]:
      - typeId
      - [data]




Entity:
  typeId: uint32
  runtimeId : uint32
  flags : uint32
    - updates-frequently: optimized for updating every tick
    - predicted: has predicted data
    - interpolated: has interpolated data
    - physics: runs through the physics loop
    - server-only: never send to clients
    - transient: server may create on clients, but will never update again


  // file format:
  var types: network types + custom? entity id?
  var flags:
    - updates-frequently: optimized for updating every tick
    - predicted: variable is part of the prediction system
    - interpolated: variable is interpolated on clients
    - server-only: never send to clients
  {
    "varsets": {
      "position": {
        "store": "position_",
        "type": "VEC3",
        "flags": [
          'UPDATES_FREQUENTLY',
          'PREDICTED'
        ]
      }
    },
    "entities": {
      "gf.sim.Entity": {
        "vars": [
          {
            // storage variable
            "store": "parentId_",
            // type on the network/in variable
            "type": "ENTITY_ID",
            // a list of flags
            "flags": []
          }
        ]
      },
      "gf.sim.entities.SoundEffectEntity": {
        "mixin": ["position"]
        "vars": [
          ""
        ]
      }
    }
  }

  // up to 64 vars per entity (or more?)
  // each var is assigned a slot at compile-time, gets optimized read/write impl
  // bitmask tables used for fast checks/deltas
  // 1 bit per var if dirty, reset on flush
  dirtyVars0_31 | dirtyVars32_63 : uint64 (64 var max?)
  // list of ordinals added to each time a var is made dirty, reset on flush
  dirtyVars[] : ordinal
  // true if anything is dirty and needs to be flushed
  dirty : bool

  // for each variable, user defined:
  this.someVar_ = ...
  // for each variable, generated:
  getSomeVar():
    return this.someVar_;
  setSomeVar(value):
    this.value_ = value; -- primitive
    goog.vec....setFromArray(value); -- vec/mat/etc
    this.dirty = true
    [if (ordinal <= 31) {]
      if (!!(this.dirtyVars0_31 & bit)) {
        this.dirtyVars.push(ordinal)
      }
      this.dirtyVars0_31 |= bit
    [} else {]
      if (!!(this.dirtyVars32_63 & (bit >> 32))) {
        this.dirtyVars.push(ordinal)
      }
      this.dirtyVars32_63 |= (bit >> 32)
    [}]

  // read/write full descriptions
  // packet:
  //   values[]
  read(packetReader):
    [this.someVar_ = packetReader.read*()] -- primitives
    [packetReader.read*(this.someVar_)] -- vec/mat/etc
  write(packetWriter):
    [packetWriter.write*(this.someVar_)]

  // read/write tagged variable diffs
  // packet:
  //   values[] : * -- all variables with updates-frequently set
  //   deltaCount : int<0,63>
  //     deltas[]:
  //       var : int<0,63>
  //       value : *
  readVarDeltas(packetReader):
    // all updates-frequently vars
    [this.someVar_ = packetReader.read*()] -- primitives
    [packetReader.read*(this.someVar_)] -- vec/mat/etc
    count = packetReader.readUint8();
    for (var n = 0; n < count; n++) {
      ordinal = packetReader.readUint8();
      switch (ordinal) {
      case X:
        this.someVar_ = packetReader.read*() -- primitives
      case Y:
        packetReader.read*(this.someVar_) -- vec/mat/etc
      }
    }

  writeVarDeltas(packetWriter):
    // all updates-frequently vars
    [packetWriter.write*(this.someVar_)]
    count = this.dirtyVars.length
    packetWriter.writeUint8(count)
    for (ordinal in this.dirtyVars) {
      packetWriter.writeUint8(ordinal);
      switch (ordinal) {
      case X:
        packetWriter.write*(this.someVar_);
      }
    }
    this.dirty_ = false;
    this.dirtyVars.length = 0;
    this.dirtyVars0_31 = this.dirtyVars32_63 = 0;
