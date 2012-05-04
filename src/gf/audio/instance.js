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

goog.provide('gf.audio.AmbientInstance');
goog.provide('gf.audio.DirectionalInstance');
goog.provide('gf.audio.Instance');
goog.provide('gf.audio.Instance.Ctor');
goog.provide('gf.audio.PointInstance');

goog.require('goog.Disposable');


/*
TODO(benvanik): flesh out audio instances:
- loop (bool)
- priority (number, 0-N, higher priority preempts existing instances)
- playbackRate (1)
- gain (1)
*/



/**
 * An instance of a cue variant playback.
 * Base type for other instances that may provide additional modifications.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {AudioContext} context Target audio context.
 * @param {AudioBuffer} audioBuffer Source audio buffer.
 * @param {!gf.audio.Cue} cue Cue this instance is playing.
 * @param {!gf.audio.Cue.Variant} variant Cue variant this instance is playing.
 */
gf.audio.Instance = function(context, audioBuffer, cue, variant) {
  goog.base(this);

  /**
   * Target audio context, if it exists.
   * @type {AudioContext}
   */
  this.context = context;

  /**
   * Cue this instance is playing.
   * @type {!gf.audio.Cue}
   */
  this.cue = cue;

  /**
   * Cue variant this instance is playing.
   * @type {!gf.audio.Cue.Variant}
   */
  this.variant = variant;

  /**
   * Source node.
   * @protected
   * @type {AudioBufferSourceNode}
   */
  this.sourceNode = null;

  /**
   * Output node. May be the same as the source node.
   * @protected
   * @type {AudioNode}
   */
  this.outputNode = null;

  if (context) {
    var node = context.createBufferSource();
    node.buffer = audioBuffer;
    this.sourceNode = node;
    this.outputNode = node;
  }
};
goog.inherits(gf.audio.Instance, goog.Disposable);


/**
 * @override
 */
gf.audio.Instance.prototype.disposeInternal = function() {
  if (this.outputNode) {
    this.outputNode.disconnect();
    this.outputNode = null;
    this.sourceNode = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Instance constructor type.
 * @typedef {function(new: gf.audio.Instance, AudioContext, AudioBuffer,
 *     !gf.audio.Cue, !gf.audio.Cue.Variant)}
 */
gf.audio.Instance.Ctor;


/**
 * Plays the instance.
 * @param {number=} opt_delay Delay, in seconds. If omitted the instance will
 *     play immediately.
 */
gf.audio.Instance.prototype.play = function(opt_delay) {
  if (this.sourceNode) {
    this.sourceNode.noteGrainOn(
        opt_delay || 0,
        this.variant.start / 1000,
        this.variant.duration / 1000);
  }
};



/**
 * An audio playback instance that has no positional information.
 *
 * @constructor
 * @extends {gf.audio.Instance}
 * @param {AudioContext} context Target audio context.
 * @param {AudioBuffer} audioBuffer Source audio buffer.
 * @param {!gf.audio.Cue} cue Cue this instance is playing.
 * @param {!gf.audio.Cue.Variant} variant Cue variant this instance is playing.
 */
gf.audio.AmbientInstance = function(context, audioBuffer, cue, variant) {
  goog.base(this, context, audioBuffer, cue, variant);

  if (this.sourceNode) {
    // Source directly to destination - no other nodes
    this.outputNode = this.sourceNode;
    this.outputNode.connect(context.destination);
  }
};
goog.inherits(gf.audio.AmbientInstance, gf.audio.Instance);



/**
 * An audio playback instance that plays from a point in space.
 *
 * @constructor
 * @extends {gf.audio.Instance}
 * @param {AudioContext} context Target audio context.
 * @param {AudioBuffer} audioBuffer Source audio buffer.
 * @param {!gf.audio.Cue} cue Cue this instance is playing.
 * @param {!gf.audio.Cue.Variant} variant Cue variant this instance is playing.
 */
gf.audio.PointInstance = function(context, audioBuffer, cue, variant) {
  goog.base(this, context, audioBuffer, cue, variant);

  /**
   * The audio panner node, if it exists.
   * @protected
   * @type {AudioPannerNode}
   */
  this.pannerNode = null;

  if (this.sourceNode) {
    // TODO(benvanik): store these parameters in JSON of Cue
    var node = context.createPanner();
    node.panningModel = 0;
    node.distanceModel = 2;
    node.refDistance = 5;
    node.maxDistance = 1000;
    node.rolloffFactor = 1.4;
    node.setPosition(0, 0, 0);
    node.setOrientation(0, 0, 0, 0, 0, 0);
    node.setVelocity(0, 0, 0);
    this.pannerNode = node;
    this.sourceNode.connect(node);
    this.outputNode = node;
    this.outputNode.connect(context.destination);
  }
};
goog.inherits(gf.audio.PointInstance, gf.audio.Instance);


/**
 * @override
 */
gf.audio.PointInstance.prototype.disposeInternal = function() {
  if (this.pannerNode) {
    this.pannerNode.disconnect();
    this.pannerNode = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Sets the position of the point instance in space.
 * @param {!goog.vec.Vec3.Type} value Position value.
 */
gf.audio.PointInstance.prototype.setPosition = function(value) {
  var node = this.pannerNode;
  if (!node) {
    return;
  }
  node.setPosition(value[0], value[1], value[2]);
};



/**
 * An audio playback instance that is facing in a direction.
 *
 * @constructor
 * @extends {gf.audio.PointInstance}
 * @param {AudioContext} context Target audio context.
 * @param {AudioBuffer} audioBuffer Source audio buffer.
 * @param {!gf.audio.Cue} cue Cue this instance is playing.
 * @param {!gf.audio.Cue.Variant} variant Cue variant this instance is playing.
 */
gf.audio.DirectionalInstance = function(context, audioBuffer, cue, variant) {
  goog.base(this, context, audioBuffer, cue, variant);
};
goog.inherits(gf.audio.DirectionalInstance, gf.audio.PointInstance);
