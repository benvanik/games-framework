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
 * @fileoverview Utilities and constants for audio formats.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.audio.formats');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.TagName');


/**
 * A list of known MIME types.
 * These will be tested for compatibility. The audio content pipeline should
 * only provide these types.
 * @private
 * @const
 * @type {!Array.<string>}
 */
gf.audio.formats.MIME_TYPES_ = [
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/mp4'
];


/**
 * Cached list of playable MIME types.
 * @private
 * @type {Object.<boolean>}
 */
gf.audio.formats.playableTypes_ = null;


/**
 * Builds the cache of playable audio types.
 * @private
 */
gf.audio.formats.cachePlayableTypes_ = function() {
  var playableTypes = {};

  // Create <audio> tag for testing - if it can't be created, we support nothing
  var audioEl = /** @type {HTMLAudioElement} */ (
      goog.dom.createElement(goog.dom.TagName.AUDIO));
  if (audioEl && audioEl.canPlayType) {
    // Test each known type
    for (var n = 0; n < gf.audio.formats.MIME_TYPES_.length; n++) {
      var mimeType = gf.audio.formats.MIME_TYPES_[n];
      playableTypes[mimeType] = !!audioEl.canPlayType(mimeType);
    }
  }

  gf.audio.formats.playableTypes_ = playableTypes;
};


/**
 * Detects whether the given MIME type can be played by the audio system.
 * @param {string} mimeType Audio file MIME type.
 * @return {boolean} True if the type can be played.
 */
gf.audio.formats.canPlayType = function(mimeType) {
  // Build cache, if required
  if (!gf.audio.formats.playableTypes_) {
    gf.audio.formats.cachePlayableTypes_();
    goog.asserts.assert(gf.audio.formats.playableTypes_);
  }
  return !!gf.audio.formats.playableTypes_[mimeType];
};


/**
 * Picks the best data source based on support and size.
 * @param {!Array.<!gf.assets.DataSource>} list Data source list.
 * @return {gf.assets.DataSource} Best data source, if any are supported.
 */
gf.audio.formats.pickBestDataSource = function(list) {
  // Data sources are sorted by size, so try each until we find one that works
  for (var n = 0; n < list.length; n++) {
    var dataSource = list[n];
    if (gf.audio.formats.canPlayType(dataSource.type)) {
      // Playable! Since sorted by size, we can exit early
      return dataSource;
    }
  }
  return null;
};
