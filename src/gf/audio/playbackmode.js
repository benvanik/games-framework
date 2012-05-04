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

goog.provide('gf.audio.PlaylistMode');

goog.require('goog.asserts');


/**
 * Cue playlist playback mode.
 * @enum {number}
 */
gf.audio.PlaylistMode = {
  /**
   * Plays the variants randomly, using the weights defined or an even
   * distribution.
   */
  RANDOM: 0,

  /**
   * Like {@see gf.audio.PlaylistMode#RANDOM}, but the same variant will not be
   * chosen twice in a row.
   */
  RANDOM_NO_REPEAT: 1,

  /**
   * Plays the variants in the order defined.
   */
  ORDERED: 2
};


/**
 * Parses a string to playlist mode value.
 * @param {string} value Playlist mode string value.
 * @return {gf.audio.PlaylistMode} Parsed playlist mode enum value.
 */
gf.audio.PlaylistMode.fromString = function(value) {
  switch (value) {
    case 'random':
      return gf.audio.PlaylistMode.RANDOM;
    case 'randomNoRepeat':
      return gf.audio.PlaylistMode.RANDOM_NO_REPEAT;
    case 'ordered':
      return gf.audio.PlaylistMode.ORDERED;
    default:
      goog.asserts.fail('Unknown playlist mode: ' + value);
      return gf.audio.PlaylistMode.RANDOM;
  }
};
