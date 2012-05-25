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

goog.provide('gf.audio.AudioManager');

goog.require('gf.Component');
goog.require('gf.audio.Listener');
goog.require('goog.array');



/**
 * Shared audio manager.
 * Handles audio playback and management.
 *
 * @constructor
 * @extends {gf.Component}
 * @param {!gf.Runtime} runtime Current runtime.
 * @param {!goog.dom.DomHelper} dom DOM helper.
 */
gf.audio.AudioManager = function(runtime, dom) {
  goog.base(this, runtime);

  /**
   * DOM.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom;

  /**
   * The Web Audio context, if it exists.
   * @type {AudioContext}
   */
  this.context = null;

  // TODO(benvanik): other browsers?
  if (goog.global['webkitAudioContext']) {
    this.context = new window.webkitAudioContext();
  } else if (goog.global['AudioContext']) {
    this.context = new window.AudioContext();
  }

  /**
   * Current listener.
   * @type {!gf.audio.Listener}
   */
  this.listener = new gf.audio.Listener(this.context);
  this.registerDisposable(this.listener);

  /**
   * All loaded sound banks.
   * @private
   * @type {!Array.<!gf.audio.SoundBank>}
   */
  this.banks_ = [];

  /**
   * All loaded track lists.
   * @private
   * @type {!Array.<!gf.audio.TrackList>}
   */
  this.trackLists_ = [];
};
goog.inherits(gf.audio.AudioManager, gf.Component);


/**
 * @override
 */
gf.audio.AudioManager.prototype.disposeInternal = function() {
  this.unloadAllSoundBanks();
  this.unloadAllTrackLists();

  goog.base(this, 'disposeInternal');
};


/**
 * Begins loading the given sound bank and adds it to the manager.
 * @param {!gf.audio.SoundBank} soundBank Sound bank to load.
 */
gf.audio.AudioManager.prototype.loadSoundBank = function(soundBank) {
  this.banks_.push(soundBank);
  soundBank.load();
};


/**
 * Unloads the given sound bank.
 * @param {!gf.audio.SoundBank} soundBank Sound bank to unload.
 */
gf.audio.AudioManager.prototype.unloadSoundBank = function(soundBank) {
  goog.array.remove(this.banks_, soundBank);
  goog.dispose(soundBank);
};


/**
 * Unloads all currently loaded sound banks.
 */
gf.audio.AudioManager.prototype.unloadAllSoundBanks = function() {
  goog.array.forEach(this.banks_, goog.dispose);
  this.banks_.length = 0;
};


/**
 * Begins loading the given track list and adds it to the manager.
 * @param {!gf.audio.TrackList} trackList Track list to load.
 */
gf.audio.AudioManager.prototype.loadTrackList = function(trackList) {
  this.trackLists_.push(trackList);
  trackList.load();
};


/**
 * Unloads the given sound track list.
 * @param {!gf.audio.TrackList} trackList Sound track list to unload.
 */
gf.audio.AudioManager.prototype.unloadTrackList = function(trackList) {
  goog.array.remove(this.trackLists_, trackList);
  goog.dispose(trackList);
};


/**
 * Unloads all currently loaded sound track lists.
 */
gf.audio.AudioManager.prototype.unloadAllTrackLists = function() {
  goog.array.forEach(this.trackLists_, goog.dispose);
  this.trackLists_.length = 0;
};
