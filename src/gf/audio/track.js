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

goog.provide('gf.audio.Track');

goog.require('gf.assets.DataSource');
goog.require('gf.audio.formats');
goog.require('goog.Disposable');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.string.path');



/**
 * Streaming sound track.
 *
 * TODO(benvanik): preloading/replay/etc
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {AudioContext} context Audio context.
 * @param {string} path Base source path.
 * @param {string} name Track name used for playback.
 * @param {number} duration Track duration, in ms.
 * @param {!Array.<!gf.assets.DataSource>} dataSources Buffer data sources.
 */
gf.audio.Track = function(context, path, name, duration, dataSources) {
  goog.base(this);

  /**
   * Target audio context, if it exists.
   * @type {AudioContext}
   */
  this.context = context;

  /**
   * Base path.
   * @type {string}
   */
  this.path = path;

  /**
   * Track name used for playback.
   * @type {string}
   */
  this.name = name;

  /**
   * Track duration, in ms.
   * @type {number}
   */
  this.duration = duration;

  /**
   * Buffer data sources, sorted by size (smallest to largest).
   * @private
   * @type {!Array.<!gf.assets.DataSource>}
   */
  this.dataSources_ = dataSources;
  gf.assets.DataSource.sortBySize(this.dataSources_);

  /**
   * Source node.
   * @private
   * @type {AudioSourceNode}
   */
  this.sourceNode_ = null;

  /**
   * Output node. May be the same as the source node.
   * @private
   * @type {AudioNode}
   */
  this.outputNode_ = null;

  /**
   * <audio> tag, if initialized.
   * @private
   * @type {HTMLAudioElement}
   */
  this.audioEl_ = null;
};
goog.inherits(gf.audio.Track, goog.Disposable);


/**
 * @override
 */
gf.audio.Track.prototype.disposeInternal = function() {
  if (this.outputNode_) {
    this.outputNode_.disconnect();
    this.outputNode_ = null;
  }
  if (this.sourceNode_) {
    this.sourceNode_.disconnect();
    this.sourceNode_ = null;
  }
  if (this.audioEl_) {
    this.audioEl_.pause();
    this.audioEl_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Loads a list of tracks from a JSON array.
 * @param {AudioContext} context Audio context.
 * @param {string} path Base audio path.
 * @param {!Object} sourceList JSON source list.
 * @return {!Array.<!gf.audio.Track>} Track list.
 */
gf.audio.Track.loadListFromJson = function(context, path, sourceList) {
  var list = [];
  if (!sourceList) {
    return list;
  }

  for (var n = 0; n < sourceList.length; n++) {
    var sourceJson = sourceList[n];

    list.push(new gf.audio.Track(
        context,
        path,
        sourceJson['name'],
        Number(sourceJson['duration']),
        gf.assets.DataSource.loadListFromJson(sourceJson['dataSources'])));
  }

  return list;
};


/**
 * Preloads the audio track.
 */
gf.audio.Track.prototype.preload = function() {
  if (!this.context) {
    // Nothing to do
    return;
  }

  if (this.audioEl_) {
    // Already loaded
    return;
  }

  // Find the best data source
  var bestDataSource = gf.audio.formats.pickBestDataSource(this.dataSources_);
  if (!bestDataSource) {
    // No supported data source found
    // TODO(benvanik): log
    return;
  }

  // Build URL
  var url = goog.string.path.join(this.path, bestDataSource.path);

  // Create <audio> tag and setup
  this.audioEl_ = /** @type {!HTMLAudioElement} */ (
      goog.dom.createElement(goog.dom.TagName.AUDIO));
  this.audioEl_.autoplay = false;
  this.audioEl_.src = url;

  // Create Web Audio node and connect
  var sourceNode = this.context.createMediaElementSource(this.audioEl_);
  sourceNode.connect(this.context.destination);
  this.sourceNode_ = sourceNode;
  this.outputNode_ = sourceNode;
};


/**
 * Begins playing the track.
 * @param {boolean=} opt_loop True to loop until stopped.
 */
gf.audio.Track.prototype.play = function(opt_loop) {
  this.preload();
  if (!this.audioEl_) {
    return;
  }

  // Play
  this.audioEl_.loop = opt_loop || false;
  this.audioEl_.play();
};


/**
 * Stops the track from playing.
 * @param {boolean=} opt_fadeOut Fade out track.
 */
gf.audio.Track.prototype.stop = function(opt_fadeOut) {
  if (!this.audioEl_) {
    return;
  }

  // TODO(benvanik): fade out
  try {
    this.audioEl_.currentTime = 0;
    this.audioEl_.pause();
  } finally {
  }
};
