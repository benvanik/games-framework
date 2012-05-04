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

goog.provide('gf.audio.JsonTrackList');

goog.require('gf.assets.ContentLoader');
goog.require('gf.assets.Observer');
goog.require('gf.audio.Track');
goog.require('gf.audio.TrackList');
goog.require('gf.log');



/**
 * Sound tracks list sourced from a JSON file.
 *
 * @constructor
 * @implements {gf.assets.Observer}
 * @extends {gf.audio.TrackList}
 * @param {!gf.Runtime} runtime Current runtime.
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 * @param {string} path Path to the sound track metadata.
 */
gf.audio.JsonTrackList = function(runtime, assetManager, context, path) {
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
goog.inherits(gf.audio.JsonTrackList, gf.audio.TrackList);


/**
 * @override
 */
gf.audio.JsonTrackList.prototype.disposeInternal = function() {
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
gf.audio.JsonTrackList.prototype.notifyAssetsChanged = function(tags) {
  for (var n = 0; n < tags.length; n++) {
    if (tags[n] == this.jsonPath_) {
      gf.log.write('TrackList ' + this.name + ' modified, reloading...');
      this.load();
      break;
    }
  }
};


/**
 * @override
 */
gf.audio.JsonTrackList.prototype.load = function() {
  this.stopAll();
  this.beginLoadingMetadata_(this.jsonPath_);
};


/**
 * Starts loading the track metadata.
 * @private
 * @param {string} path JSON metadata path.
 */
gf.audio.JsonTrackList.prototype.beginLoadingMetadata_ = function(path) {
  var assetLoader = new gf.assets.ContentLoader(
      this.jsonPath_, gf.assets.ContentLoader.Type.JSON);
  this.jsonLoadingDeferred_ = this.assetManager.load(assetLoader);
  this.jsonLoadingDeferred_.addCallbacks(
      this.handleJsonLoad_, this.handleJsonError_, this);
};


/**
 * Handles successful metadata load events.
 * @private
 * @param {!Object} content Content.
 */
gf.audio.JsonTrackList.prototype.handleJsonLoad_ = function(content) {
  this.jsonLoadingDeferred_ = null;

  /*
  {
    name: string,
    tracks: [
      <track json>, ...
    ]
  }
  */

  this.name = content['name'];

  var jsonTracks = content['tracks'];
  var trackList = gf.audio.Track.loadListFromJson(this.context, this.path,
      jsonTracks);
  this.setTrackList(trackList);

  this.beginPlayback();
};


/**
 * Handles failed/aborted asset load events.
 * @private
 * @param {Object} arg Error info.
 */
gf.audio.JsonTrackList.prototype.handleJsonError_ = function(arg) {
  this.jsonLoadingDeferred_ = null;
};
