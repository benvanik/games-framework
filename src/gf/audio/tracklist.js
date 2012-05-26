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

goog.provide('gf.audio.TrackList');

goog.require('gf.log');
goog.require('goog.Disposable');
goog.require('goog.object');



/**
 * Sound tracks.
 * Tracks are streamed in and have very simple controls. Use them for background
 * music and other long-running sounds.
 * If possible, only one track should be loaded and playing at a time to reduce
 * processor/memory load.
 *
 * Track lists are designed to gracefully support async loading - one should
 * try to use {@see gf.audio.TrackList#play} with string values instead of
 * {@see gf.audio.TrackList#getTrack} to enable code to work regardless of the
 * load state of the list.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 * @param {string} path Path to the sound track base folder.
 * @param {string=} opt_name Human-readable name for debugging.
 * @param {Array.<!gf.audio.Track>=} opt_trackList A list of audio tracks.
 */
gf.audio.TrackList = function(assetManager, context, path,
    opt_name, opt_trackList) {
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
   * A map of track names to tracks.
   * @private
   * @type {!Object.<!gf.audio.Track>}
   */
  this.tracks_ = {};
  if (opt_trackList) {
    this.setTrackList(opt_trackList);
  }
};
goog.inherits(gf.audio.TrackList, goog.Disposable);


/**
 * @override
 */
gf.audio.TrackList.prototype.disposeInternal = function() {
  // TODO(benvanik): stop all playback of tracks

  goog.base(this, 'disposeInternal');
};


/**
 * Sets the track list.
 * @protected
 * @param {!Array.<!gf.audio.Track>} trackList List of tracks.
 */
gf.audio.TrackList.prototype.setTrackList = function(trackList) {
  for (var n = 0; n < trackList.length; n++) {
    var track = trackList[n];
    this.tracks_[track.name] = track;
  }
};


/**
 * Begins loading the track list.
 */
gf.audio.TrackList.prototype.load = function() {
  this.stopAll();
  this.beginPlayback();
};


/**
 * Begins playback of any queued tracks.
 * @protected
 */
gf.audio.TrackList.prototype.beginPlayback = function() {
  // TODO(benvanik): play queued tracks
};


/**
 * Gets a list of all audio tracks.
 * @return {!Array.<!gf.audio.Track>} All audio tracks.
 */
gf.audio.TrackList.prototype.getAllTracks = function() {
  var tracks = [];
  for (var name in this.tracks_) {
    tracks.push(this.tracks_[name]);
  }
  return tracks;
};


/**
 * Gets a named track from the sound track list.
 * @param {string} name Track name.
 * @return {gf.audio.Track} Track with the given name, if found.
 */
gf.audio.TrackList.prototype.getTrack = function(name) {
  return this.tracks_[name];
};


/**
 * Begins playback of the given track.
 * @param {!gf.audio.Track|string} track Track to play.
 * @param {boolean=} opt_loop True to loop until stopped.
 * @param {boolean=} opt_crossFade True to stop existing tracks and cross-fade
 *     to the new one.
 * @return {gf.audio.Track} The track that is playing, if any.
 */
gf.audio.TrackList.prototype.play = function(track, opt_loop, opt_crossFade) {
  /** @type {gf.audio.Track} */
  var realTrack;
  if (goog.isString(track)) {
    realTrack = this.getTrack(track);
  } else {
    realTrack = track;
  }
  if (!realTrack) {
    gf.log.write('WARNING: track ' + track + ' not found in list');
    return null;
  }

  // Stop all existing tracks
  this.stopAll(opt_crossFade);

  // TODO(benvanik): cross-fade support
  realTrack.play(opt_loop);

  return realTrack;
};


/**
 * Stops all playing tracks.
 * @param {boolean=} opt_fadeOut Fade out tracks.
 */
gf.audio.TrackList.prototype.stopAll = function(opt_fadeOut) {
  goog.object.forEach(this.tracks_,
      /**
       * @this {gf.audio.TrackList}
       * @param {!gf.audio.Track} track Track.
       */
      function(track) {
        track.stop(opt_fadeOut);
      }, this);
};
