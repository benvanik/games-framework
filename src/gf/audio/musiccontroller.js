/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
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

goog.provide('gf.audio.MusicController');

goog.require('goog.Disposable');
goog.require('goog.Timer');



/**
 * Music playback controller.
 * Handles the loading and randomized playback of music tracks.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.audio.AudioManager} audioManager Audio manager.
 */
gf.audio.MusicController = function(assetManager, audioManager) {
  goog.base(this);

  /**
   * @private
   * @type {!gf.assets.AssetManager}
   */
  this.assetManager_ = assetManager;

  /**
   * @private
   * @type {!gf.audio.AudioManager}
   */
  this.audioManager_ = audioManager;

  /**
   * Whether music playback is muted.
   * @private
   * @type {boolean}
   */
  this.isMuted_ = false;

  /**
   * Whether any tracks are playing.
   * @private
   * @type {boolean}
   */
  this.isPlaying_ = false;

  /**
   * Timer ID for the next track play event.
   * @private
   * @type {?number}
   */
  this.nextTimerId_ = null;

  /**
   * Background sound track list, if set.
   * @private
   * @type {gf.audio.TrackList}
   */
  this.trackList_ = null;
};
goog.inherits(gf.audio.MusicController, goog.Disposable);


/**
 * @override
 */
gf.audio.MusicController.prototype.disposeInternal = function() {
  this.setTrackList(null);
  goog.base(this, 'disposeInternal');
};


/**
 * @return {gf.audio.TrackList} The track list, if any.
 */
gf.audio.MusicController.prototype.getTrackList = function() {
  return this.trackList_;
};


/**
 * Sets the track list used for picking songs.
 * @param {gf.audio.TrackList} trackList New track list. Assumed unloaded.
 */
gf.audio.MusicController.prototype.setTrackList = function(trackList) {
  if (trackList == this.trackList_) {
    return;
  }

  // Stop and unload existing tracks
  if (this.trackList_) {
    this.stop();
    this.audioManager_.unloadTrackList(this.trackList_);
  }

  // Set the new track list
  this.trackList_ = trackList;

  // Load and start playing the new track list
  if (this.trackList_) {
    this.audioManager_.loadTrackList(this.trackList_);
    if (!this.isMuted_) {
      this.scheduleNextPlay_(0);
    }
  }
};


/**
 * Sets whether music should be muted.
 * @param {boolean} value Whether music should be muted.
 */
gf.audio.MusicController.prototype.setMuted = function(value) {
  if (this.isMuted_ == value) {
    return;
  }
  if (value) {
    // Stop in progress music playback if muting
    this.stop();
  }
  this.isMuted_ = value;
};


/**
 * Starts playing a track if none are playing or stops the playing track.
 */
gf.audio.MusicController.prototype.togglePlayback = function() {
  if (this.isPlaying_) {
    this.stop();
  } else {
    this.playRandom();
  }
};


/**
 * Minimum playback interval, in seconds.
 * @private
 * @const
 * @type {number}
 */
gf.audio.MusicController.MIN_PLAYBACK_INTERVAL_ = 10;


/**
 * Average playback interval, in seconds.
 * @private
 * @const
 * @type {number}
 */
gf.audio.MusicController.AVG_PLAYBACK_INTERVAL_ = 60;


/**
 * Schedules the next track start.
 * @private
 * @param {number} minTime Minimum amount of time that must elapse before
 *     playback can begin, in ms.
 */
gf.audio.MusicController.prototype.scheduleNextPlay_ =
    function(minTime) {
  var silence = (gf.audio.MusicController.MIN_PLAYBACK_INTERVAL_ +
      Math.random() * gf.audio.MusicController.AVG_PLAYBACK_INTERVAL_);
  silence *= 1000;
  var nextStart = minTime + silence;
  goog.Timer.clear(this.nextTimerId_);
  this.nextTimerId_ = goog.Timer.callOnce(this.playRandom, nextStart, this);
};


/**
 * Starts playing a random track.
 */
gf.audio.MusicController.prototype.playRandom = function() {
  if (this.isMuted_ || !this.trackList_) {
    return;
  }
  this.stop();

  var track = null;
  var tracks = this.trackList_.getAllTracks();
  // TODO(benvanik): randomly pick a track
  // TODO(benvanik): way to have track themes? naming scheme? metadata?
  // TODO(benvanik): check what's playing and ensure something else
  if (tracks.length) {
    track = tracks[0];
  }
  if (!track) {
    return;
  }

  // Play
  this.trackList_.play(track);
  this.isPlaying_ = true;

  // Schedule the next track
  this.scheduleNextPlay_(track.duration);
};


/**
 * Stops any playback that may be occuring.
 */
gf.audio.MusicController.prototype.stop = function() {
  if (!this.trackList_) {
    return;
  }

  if (this.nextTimerId_ !== null) {
    goog.Timer.clear(this.nextTimerId_);
    this.nextTimerId_ = null;
  }

  this.trackList_.stopAll();
  this.isPlaying_ = false;
};
