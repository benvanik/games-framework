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
 * @fileoverview Definitions for the Web Audio API.
 * @see https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html
 * @externs
 */



/**
 * @constructor
 */
function AudioParam() {}
/** @type {number} */
AudioParam.prototype.value;
/** @type {number} */
AudioParam.prototype.minValue;
/** @type {number} */
AudioParam.prototype.maxValue;
/** @type {number} */
AudioParam.prototype.defaultValue;
/** @type {string} */
AudioParam.prototype.name;
/** @type {number} */
AudioParam.prototype.units;
// TODO(benvanik): set methods/etc



/**
 * @constructor
 * @extends {AudioParam}
 */
function AudioGain() {}



/**
 * @constructor
 */
function AudioBuffer() {}
/** @type {!AudioGain} */
AudioBuffer.prototype.gain;
/** @type {number} */
AudioBuffer.prototype.sampleRate;
/** @type {number} */
AudioBuffer.prototype.length;
/** @type {number} */
AudioBuffer.prototype.duration;
/** @type {number} */
AudioBuffer.prototype.numberOfChannels;
/**
 * @param {number} channel
 * @return {Float32Array}
 */
AudioBuffer.prototype.getChannelData = function(channel) {};



/**
 * @constructor
 */
function AudioNode() {}
/** @type {!AudioContext} */
AudioNode.prototype.context;
/** @type {number} */
AudioNode.prototype.numberOfInputs;
/** @type {number} */
AudioNode.prototype.numberOfOutputs;
/**
 * @param {!AudioNode} destination
 * @param {number=} opt_output
 * @param {number=} opt_input
 */
AudioNode.prototype.connect = function(destination, opt_output, opt_input) {};
/**
 * @param {number=} opt_output
 */
AudioNode.prototype.disconnect = function(opt_output) {};



/**
 * @constructor
 * @extends {AudioNode}
 */
function AudioSourceNode() {}



/**
 * @constructor
 * @extends {AudioSourceNode}
 */
function MediaElementAudioSourceNode() {}



/**
 * @constructor
 * @extends {AudioSourceNode}
 */
function AudioBufferSourceNode() {}
/** @type {AudioBuffer} */
AudioBufferSourceNode.prototype.buffer;
/** @type {!AudioGain} */
AudioBufferSourceNode.prototype.gain;
/** @type {!AudioParam} */
AudioBufferSourceNode.prototype.playbackRate;
/** @type {boolean} */
AudioBufferSourceNode.prototype.loop;
/**
 * @param {number} when
 */
AudioBufferSourceNode.prototype.noteOn = function(when) {};
/**
 * @param {number} when
 * @param {number} grainOffset
 * @param {number} grainDuration
 */
AudioBufferSourceNode.prototype.noteGrainOn = function(when,
    grainOffset, grainDuration) {};
/**
 * @param {number} when
 */
AudioBufferSourceNode.prototype.noteOff = function(when) {};



/**
 * @constructor
 * @extends {AudioNode}
 */
function AudioPannerNode() {}
/**
 * @const
 * @type {number}
 */
AudioPannerNode.EQUALPOWER = 0;
/**
 * @const
 * @type {number}
 */
AudioPannerNode.HRTF = 1;
/**
 * @const
 * @type {number}
 */
AudioPannerNode.SOUNDFIELD = 2;
/** @type {number} */
AudioPannerNode.prototype.panningModel;
/** @type {number} */
AudioPannerNode.prototype.distanceModel;
/** @type {number} */
AudioPannerNode.prototype.refDistance;
/** @type {number} */
AudioPannerNode.prototype.maxDistance;
/** @type {number} */
AudioPannerNode.prototype.rolloffFactor;
/** @type {number} */
AudioPannerNode.prototype.coneInnerAngle;
/** @type {number} */
AudioPannerNode.prototype.coneOuterAngle;
/** @type {number} */
AudioPannerNode.prototype.coneOuterGain;
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
AudioPannerNode.prototype.setPosition = function(x, y, z) {};
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} xUp
 * @param {number} yUp
 * @param {number} zUp
 */
AudioPannerNode.prototype.setOrientation = function(x, y, z, xUp, yUp, zUp) {};
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
AudioPannerNode.prototype.setVelocity = function(x, y, z) {};



/**
 * @constructor
 * @extends {AudioNode}
 */
function AudioDestinationNode() {}
/** @type {number} */
AudioDestinationNode.prototype.numberOfChannels;



/**
 * @constructor
 */
function AudioListener() {}
/** @type {number} */
AudioListener.prototype.gain;
/** @type {number} */
AudioListener.prototype.dopplerFactor;
/** @type {number} */
AudioListener.prototype.speedOfSound;
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
AudioListener.prototype.setPosition = function(x, y, z) {};
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} xUp
 * @param {number} yUp
 * @param {number} zUp
 */
AudioListener.prototype.setOrientation = function(x, y, z, xUp, yUp, zUp) {};
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
AudioListener.prototype.setVelocity = function(x, y, z) {};



/**
 * @constructor
 */
function AudioContext() {}
/** @type {!AudioDestinationNode} */
AudioContext.prototype.destination;
/** @type {number} */
AudioContext.prototype.sampleRate;
/** @type {number} */
AudioContext.prototype.currentTime;
/** @type {!AudioListener} */
AudioContext.prototype.listener;
/**
 * @param {!ArrayBuffer} buffer
 * @param {boolean} mixToMono
 * @return {!AudioBuffer}
 */
AudioContext.prototype.createBuffer = function(buffer, mixToMono) {};
/**
 * @param {!ArrayBuffer} audioData
 * @param {!(function(!AudioBuffer): void)} successCallback
 * @param {(function(): void)=} opt_errorCallback
 */
AudioContext.prototype.decodeAudioData = function(audioData, successCallback,
    opt_errorCallback) {};
/**
 * @return {!AudioBufferSourceNode}
 */
AudioContext.prototype.createBufferSource = function() {};
/**
 * @param {HTMLAudioElement|HTMLVideoElement} element
 * @return {!MediaElementAudioSourceNode}
 */
AudioContext.prototype.createMediaElementSource = function(element) {};
/**
 * @return {!AudioPannerNode}
 */
AudioContext.prototype.createPanner = function() {};



/** @type {function(new:AudioContext)|undefined} */
window.AudioContext;
/** @type {function(new:AudioContext)|undefined} */
window.webkitAudioContext;
/** @type {AudioPannerNode} */
window.AudioPannerNode;
/** @type {AudioPannerNode} */
window.webkitAudioPannerNode;
