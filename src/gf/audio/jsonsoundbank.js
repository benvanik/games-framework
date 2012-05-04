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

goog.provide('gf.audio.JsonSoundBank');

goog.require('gf.assets.ContentLoader');
goog.require('gf.assets.DataSource');
goog.require('gf.assets.Observer');
goog.require('gf.audio.Cue');
goog.require('gf.audio.SoundBank');
goog.require('gf.log');



/**
 * Sound bank sourced from a JSON metadata file.
 *
 * @constructor
 * @implements {gf.assets.Observer}
 * @extends {gf.audio.SoundBank}
 * @param {!gf.Runtime} runtime Current runtime.
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 * @param {string} path Path to the sound bank metadata.
 */
gf.audio.JsonSoundBank = function(runtime, assetManager, context, path) {
  var lastSlash = path.lastIndexOf('/');
  var basePath = lastSlash >= 0 ? path.substr(0, lastSlash) : '';
  goog.base(this, assetManager, context, basePath);

  /**
   * Runtime that the component is currently registered in.
   * @type {!gf.Runtime}
   */
  this.runtime = runtime;

  /**
   * Path to the JSON metadata file.
   * @private
   * @type {string}
   */
  this.jsonPath_ = path;

  /**
   * A deferred used for loading.
   * @private
   * @type {goog.async.Deferred}
   */
  this.jsonLoadingDeferred_ = null;

  // Observe changes
  if (this.runtime.buildClient) {
    this.runtime.buildClient.addObserver(this);
  }
};
goog.inherits(gf.audio.JsonSoundBank, gf.audio.SoundBank);


/**
 * @override
 */
gf.audio.JsonSoundBank.prototype.disposeInternal = function() {
  // Stop observing
  if (this.runtime.buildClient) {
    this.runtime.buildClient.removeObserver(this);
  }

  if (this.jsonLoadingDeferred_) {
    this.jsonLoadingDeferred_.cancel();
    this.jsonLoadingDeferred_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * @override
 */
gf.audio.JsonSoundBank.prototype.notifyAssetsChanged = function(tags) {
  for (var n = 0; n < tags.length; n++) {
    if (tags[n] == this.jsonPath_) {
      gf.log.write('SoundBank ' + this.name + ' modified, reloading...');
      this.load();
      break;
    }
  }
};


/**
 * @override
 */
gf.audio.JsonSoundBank.prototype.load = function() {
  this.beginLoadingMetadata_(this.jsonPath_);
};


/**
 * Starts loading the bank metadata.
 * @private
 * @param {string} path JSON metadata path.
 */
gf.audio.JsonSoundBank.prototype.beginLoadingMetadata_ = function(path) {
  var assetLoader = new gf.assets.ContentLoader(
      this.jsonPath_, gf.assets.ContentLoader.Type.JSON);
  this.jsonLoadingDeferred_ = this.assetManager.load(assetLoader);
  this.jsonLoadingDeferred_.addCallbacks(
      this.handleJsonLoad_, this.handleError, this);
};


/**
 * Handles successful metadata load events.
 * @private
 * @param {!Object} content Content.
 */
gf.audio.JsonSoundBank.prototype.handleJsonLoad_ = function(content) {
  this.jsonLoadingDeferred_ = null;

  /*
  {
    name: string,
    dataSources: [
      {
          type: ('audio/wav', 'audio/mpeg',
                    'audio/mp4; codecs="mp4a.40.5"', 'audio/ogg', etc)
          path: string path,
          size: bytes
      }, ...
    ],
    cues: [<cue json>, ...]
  }
  */

  this.name = content['name'];
  this.setDataSources(
      gf.assets.DataSource.loadListFromJson(content['dataSources']));

  var jsonCues = content['cues'];
  var cueList = gf.audio.Cue.loadListFromJson(jsonCues);
  this.setCueList(cueList);

  this.beginLoadingData();
};


/**
 * @override
 */
gf.audio.JsonSoundBank.prototype.handleError = function(arg) {
  this.jsonLoadingDeferred_ = null;

  goog.base(this, 'handleError', arg);
};
