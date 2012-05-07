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

goog.provide('gf.audio.SoundBank');

goog.require('gf.assets.ContentLoader');
goog.require('gf.assets.DataSource');
goog.require('gf.audio.AmbientInstance');
goog.require('gf.audio.DirectionalInstance');
goog.require('gf.audio.PointInstance');
goog.require('gf.audio.formats');
goog.require('gf.log');
goog.require('goog.Disposable');
goog.require('goog.string.path');



/**
 * Sound bank.
 *
 * Sound banks are designed to gracefully support async loading - one should
 * try to use {@code play} variants with string values instead of
 * {@see gf.audio.SoundBank#getCue} to enable code to work regardless of the
 * load state of the bank.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 * @param {string} path Path to the sound bank base folder.
 * @param {string=} opt_name Human-readable name for debugging.
 * @param {Array.<!gf.assets.DataSource>=} opt_dataSources A list of data
 *     sources, unsorted.
 * @param {Array.<!gf.audio.Cue>=} opt_cueList A list of audio cues.
 */
gf.audio.SoundBank = function(assetManager, context, path,
    opt_name, opt_dataSources, opt_cueList) {
  goog.base(this);

  /**
   * Asset manager used for loads.
   * @type {!gf.assets.AssetManager}
   */
  this.assetManager = assetManager;

  /**
   * Target audio context, if it exists.
   * @type {AudioContext}
   */
  this.context = context;

  /**
   * Source path base folder.
   * @type {string}
   */
  this.path = path;

  /**
   * Human-readable name for debugging.
   * @type {string}
   */
  this.name = opt_name || 'Unknown';

  /**
   * Buffer data sources, sorted by size (smallest to largest).
   * @private
   * @type {!Array.<!gf.assets.DataSource>}
   */
  this.dataSources_ = opt_dataSources || [];
  if (opt_dataSources) {
    this.setDataSources(opt_dataSources);
  }

  /**
   * A map of cue names to cues.
   * @private
   * @type {!Object.<!gf.audio.Cue>}
   */
  this.cues_ = {};
  if (opt_cueList) {
    this.setCueList(opt_cueList);
  }

  /**
   * Buffer source node, if it is loaded.
   * @private
   * @type {AudioBuffer}
   */
  this.audioBuffer_ = null;

  /**
   * A deferred used for loading.
   * @private
   * @type {goog.async.Deferred}
   */
  this.loadingDeferred_ = null;

  // TODO(benvanik): instance lists/queues/etc
};
goog.inherits(gf.audio.SoundBank, goog.Disposable);


/**
 * @override
 */
gf.audio.SoundBank.prototype.disposeInternal = function() {
  // TODO(benvanik): stop all playback of instances

  if (this.loadingDeferred_) {
    this.loadingDeferred_.cancel();
    this.loadingDeferred_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Sets the data source list.
 * @protected
 * @param {!Array.<!gf.assets.DataSource>} dataSources List of data sources.
 */
gf.audio.SoundBank.prototype.setDataSources = function(dataSources) {
  this.dataSources_ = dataSources;

  gf.assets.DataSource.sortBySize(this.dataSources_);
};


/**
 * Sets the cue list.
 * @protected
 * @param {!Array.<!gf.audio.Cue>} cueList List of cues.
 */
gf.audio.SoundBank.prototype.setCueList = function(cueList) {
  for (var n = 0; n < cueList.length; n++) {
    var cue = cueList[n];
    this.cues_[cue.name] = cue;
  }
};


/**
 * Begins loading the sound bank.
 */
gf.audio.SoundBank.prototype.load = function() {
  this.beginLoadingData();
};


/**
 * Starts loading the audio data buffer.
 * @protected
 */
gf.audio.SoundBank.prototype.beginLoadingData = function() {
  // If there is no audio context we can't do anything, so never load the buffer
  if (!this.context) {
    // TODO(benvanik): log?
    return;
  }

  // Find the best data source
  var bestDataSource = gf.audio.formats.pickBestDataSource(this.dataSources_);
  if (!bestDataSource) {
    // No supported data source found
    // TODO(benvanik): log
    return;
  }

  // Load the data
  var url = goog.string.path.join(this.path, bestDataSource.path);
  var assetLoader = new gf.assets.ContentLoader(
      url, gf.assets.ContentLoader.Type.ARRAY_BUFFER);
  this.loadingDeferred_ = this.assetManager.load(assetLoader);
  this.loadingDeferred_.addCallbacks(this.handleLoad_, this.handleError, this);
};


/**
 * Handles successful asset load events.
 * @private
 * @param {!ArrayBuffer} content Content.
 */
gf.audio.SoundBank.prototype.handleLoad_ = function(content) {
  this.loadingDeferred_ = null;

  var ctx = this.context;
  if (!ctx) {
    // Nothing to do here - no audio context
    return;
  }

  ctx.decodeAudioData(content, goog.bind(function(audioBuffer) {
    // Succeeded!
    this.audioBuffer_ = audioBuffer;
  }, this), goog.bind(function() {
    // Failed to load
    gf.log.write('failed to load audio buffer data');
  }, this));
};


/**
 * Handles failed/aborted asset load events.
 * @protected
 * @param {Object} arg Error info.
 */
gf.audio.SoundBank.prototype.handleError = function(arg) {
  this.loadingDeferred_ = null;
};


/**
 * Gets a named cue from the sound bank.
 * @param {string} name Cue name.
 * @return {gf.audio.Cue} Cue with the given name, if found.
 */
gf.audio.SoundBank.prototype.getCue = function(name) {
  return this.cues_[name];
};


/**
 * Plays a cue with the given instance type.
 * @private
 * @param {!gf.audio.Cue|string} cue Cue to play.
 * @param {!gf.audio.Instance.Ctor} instanceCtor Instance constructor.
 * @return {gf.audio.Instance} New instance.
 */
gf.audio.SoundBank.prototype.play_ = function(cue, instanceCtor) {
  if (!this.audioBuffer_) {
    return null;
  }

  /** @type {gf.audio.Cue} */
  var realCue;
  if (goog.isString(cue)) {
    realCue = this.getCue(cue);
  } else {
    realCue = cue;
  }
  if (!realCue) {
    gf.log.write('WARNING: cue ' + cue + ' not found in bank ' + this.name);
    return null;
  }

  // Get the variant to play
  var variant = realCue.getNextVariant();
  if (!variant) {
    return null;
  }

  // Setup instance
  var instance = new instanceCtor(
      this.context,
      this.audioBuffer_,
      realCue,
      variant);

  // TODO(benvanik): schedule instance?
  instance.play();

  return instance;
};


/**
 * Begins playback of the given cue as an ambient source.
 * @param {!gf.audio.Cue|string} cue Cue to play.
 * @return {gf.audio.AmbientInstance} The cue playback instance, if playing.
 */
gf.audio.SoundBank.prototype.playAmbient = function(cue) {
  return /** @type {gf.audio.AmbientInstance} */ (
      this.play_(cue, gf.audio.AmbientInstance));
};


/**
 * Begins playback of the given cue as a point source.
 * @param {!gf.audio.Cue|string} cue Cue to play.
 * @param {!goog.vec.Vec3.Float32} position Position in the scene.
 * @return {gf.audio.PointInstance} The cue playback instance, if playing.
 */
gf.audio.SoundBank.prototype.playPoint = function(cue, position) {
  var instance = /** @type {gf.audio.PointInstance} */ (
      this.play_(cue, gf.audio.PointInstance));
  if (instance) {
    instance.setPosition(position);
  }
  return instance;
};


/**
 * Begins playback of the given cue as a directional source.
 * @param {!gf.audio.Cue|string} cue Cue to play.
 * @return {gf.audio.DirectionalInstance} The cue playback instance, if playing.
 */
gf.audio.SoundBank.prototype.playDirectional = function(cue) {
  var instance = /** @type {gf.audio.DirectionalInstance} */ (
      this.play_(cue, gf.audio.DirectionalInstance));
  // TODO(benvanik): set properties
  return instance;
};
