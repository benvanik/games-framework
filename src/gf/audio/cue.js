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

goog.provide('gf.audio.Cue');

goog.require('gf.audio.PlaylistMode');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');

/*
TODO(benvanik): add instancing parameters to JSON
- instanceLimit
- instanceMaxMode: failToPlay, queue, replace
- instanceReplaceMode: oldest, quietest
*/



/**
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} name Cue name used for playback.
 * @param {gf.audio.PlaylistMode} playlistMode Playlist playback mode.
 * @param {!Array.<!gf.audio.Cue.Variant>} playlist Variant playlist.
 */
gf.audio.Cue = function(name, playlistMode, playlist) {
  goog.base(this);

  /**
   * Cue name used for playback.
   * @type {string}
   */
  this.name = name;

  /**
   * Playlist playback mode.
   * @type {gf.audio.PlaylistMode}
   */
  this.playlistMode = playlistMode;

  /**
   * A sum of all of the weights of all variants, used for random selection.
   * @private
   * @type {number}
   */
  this.weightSum_ = 0;
  // NOTE: generated below when creating the variants

  /**
   * Playback index, when running in ordered mode. Will be the index of the
   * next variant to play.
   * @private
   * @type {number}
   */
  this.playbackIndex_ = 0;

  /**
   * Last played variant, for supporting the no-repeat random mode.
   * @private
   * @type {gf.audio.Cue.Variant}
   */
  this.lastVariantPlayed_ = null;

  /**
   * Playlist containing audio variants.
   * @type {!Array.<!gf.audio.Cue.Variant>}
   */
  this.playlist = playlist;

  // Compute summed weight for random selection
  for (var n = 0; n < this.playlist.length; n++) {
    this.weightSum_ += this.playlist[n].weight;
  }

  // Sort the playlist by order - makes ordered mode easier
  goog.array.sort(this.playlist, gf.audio.Cue.Variant.compareOrder);
};
goog.inherits(gf.audio.Cue, goog.Disposable);


/**
 * Loads a list of cues from a JSON array.
 * @param {!Object} sourceList JSON source list.
 * @return {!Array.<!gf.audio.Cue>} Cue list.
 */
gf.audio.Cue.loadListFromJson = function(sourceList) {
  var list = [];
  if (!sourceList) {
    return list;
  }

  for (var n = 0; n < sourceList.length; n++) {
    var sourceJson = sourceList[n];

    var jsonPlaylist = /** @type {Array.<!Object>} */ (sourceJson['playlist']);
    goog.asserts.assert(jsonPlaylist);
    var playlist = [];
    for (var m = 0; m < jsonPlaylist.length; m++) {
      playlist.push(gf.audio.Cue.Variant.fromJson(jsonPlaylist[m]));
    }

    list.push(new gf.audio.Cue(
        sourceJson['name'],
        sourceJson['playlistMode'] ?
            gf.audio.PlaylistMode.fromString(sourceJson['playlistMode']) :
            gf.audio.PlaylistMode.RANDOM,
        playlist));
  }

  return list;
};


/**
 * Gets the next variant for playback.
 * @return {gf.audio.Cue.Variant} Variant to play.
 */
gf.audio.Cue.prototype.getNextVariant = function() {
  // Quick checks for base cases
  if (!this.playlist.length) {
    return null;
  } else if (this.playlist.length == 1) {
    return this.playlist[0];
  }

  switch (this.playlistMode) {
    case gf.audio.PlaylistMode.RANDOM:
      return this.nextRandom_(true);
    case gf.audio.PlaylistMode.RANDOM_NO_REPEAT:
      return this.nextRandom_(false);
    case gf.audio.PlaylistMode.ORDERED:
      return this.nextOrdered_();
    default:
      goog.asserts.fail('Unknown playlist mode');
      return this.nextRandom_(true);
  }
};


/**
 * Gets the next variant randomly.
 * @private
 * @param {boolean} allowRepeats Whether to allow two of the same variants to be
 *     returned in a row.
 * @return {!gf.audio.Cue.Variant} Next variant.
 */
gf.audio.Cue.prototype.nextRandom_ = function(allowRepeats) {
  goog.asserts.assert(this.playlist.length);

  // Loop at most 5 times to try to pick a non-repeat (so we don't go forever)
  for (var n = 0; n < 5; n++) {
    // Weighted random selection
    // NOTE: if the lists get large this can be optimized by sorting by
    // cumulative weight and binary searching based on the picked value -
    // hopefully the lists remain small for now...
    var variant = null;
    var i = Math.random() * this.weightSum_;
    for (var m = 0; m < this.playlist.length; m++) {
      variant = this.playlist[m];
      if (i < variant.weight) {
        break;
      }
      i -= variant.weight;
    }
    goog.asserts.assert(variant);
    if (!allowRepeats) {
      // Check if the same as played last time - if so, try again
      if (variant == this.lastVariantPlayed_) {
        continue;
      }
    }
    this.lastVariantPlayed_ = variant;
    return variant;
  }
  return this.lastVariantPlayed_ || this.playlist[0];
};


/**
 * Gets the next variant from the ordered list.
 * @private
 * @return {!gf.audio.Cue.Variant} Next variant.
 */
gf.audio.Cue.prototype.nextOrdered_ = function() {
  goog.asserts.assert(this.playlist.length);
  var variant = this.playlist[this.playbackIndex_];
  this.playbackIndex_ = (this.playbackIndex_ + 1) % this.playlist.length;
  return variant;
};



/**
 * Cue playlist variant entry.
 * @constructor
 * @param {number} start Starting offset in the buffer, in ms.
 * @param {number} duration Total duration in the buffer, in ms.
 * @param {number=} opt_weight Weighting for random playback, [0-1].
 * @param {number=} opt_order Playback ordinal.
 */
gf.audio.Cue.Variant = function(start, duration, opt_weight, opt_order) {
  /**
   * Starting offset in the buffer, in ms.
   * @type {number}
   */
  this.start = start;

  /**
   * Total duration in the buffer, in ms.
   * @type {number}
   */
  this.duration = duration;

  /**
   * Weighting for random playback, [0-1].
   * @type {number}
   */
  this.weight = goog.isDef(opt_weight) ? opt_weight : 1;

  /**
   * Playback ordinal.
   * @type {number}
   */
  this.order = opt_order || 0;
};


/**
 * Creates a cue variant entry from a JSON blob.
 * @param {!Object} json JSON blob.
 * @return {!gf.audio.Cue.Variant} Parsed variant.
 */
gf.audio.Cue.Variant.fromJson = function(json) {
  return new gf.audio.Cue.Variant(
      Number(json['start']),
      Number(json['duration']),
      goog.isDef(json['weight']) ? Number(json['weight']) : undefined,
      goog.isDef(json['order']) ? Number(json['order']) : undefined);
};


/**
 * Compares two variants based on order.
 * @param {!gf.audio.Cue.Variant} a First variant.
 * @param {!gf.audio.Cue.Variant} b Second variant.
 * @return {number} Sort order.
 */
gf.audio.Cue.Variant.compareOrder = function(a, b) {
  return a.order - b.order;
};
