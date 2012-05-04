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

goog.provide('gf.graphics.DepthState');

goog.require('goog.webgl');



/**
 * Depth state settings.
 * Encapsulates state settings relating to the depth buffer.
 * State setting objects should be treated as immutable once defined. Create new
 * state setting objects and switch between them to change state.
 *
 * @constructor
 */
gf.graphics.DepthState = function() {
  /**
   * Whether depth testing is enabled.
   * Maps to gl.enable(DEPTH_TEST) / gl.disable(DEPTH_TEST).
   * @type {boolean}
   */
  this.depthTestEnabled = false;

  /**
   * Function used to compare pixel depth.
   * Maps to gl.depthFunc.
   * @type {number}
   */
  this.depthFunc = goog.webgl.LESS;

  /**
   * Near depth range.
   * Maps to gl.depthRange.
   * @type {number}
   */
  this.depthRangeNear = 0;

  /**
   * Far depth range.
   * Maps to gl.depthRange.
   * @type {number}
   */
  this.depthRangeFar = 1;

  /**
   * Whether the depth buffer is enabled for writing.
   * Maps to gl.depthMask.
   * @type {boolean}
   */
  this.depthMask = true;

  /**
   * Whether polygon offseting is enabled.
   * Maps to gl.enable(POLYGON_OFFSET_FILL) / gl.disable(POLYGON_OFFSET_FILL).
   * @type {boolean}
   */
  this.polygonOffsetEnabled = false;

  /**
   * A scale factor used to create a variable depth offset for each polygon.
   * Maps to gl.polygonOffset.
   * @type {number}
   */
  this.polygonOffsetFactor = 0;

  /**
   * Multiplied by an implementation-specific value to create a constant depth
   * offset.
   * Maps to gl.polygonOffset.
   * @type {number}
   */
  this.polygonOffsetUnits = 0;
};


/**
 * Makes the depth state active.
 * If a previous state is provided then only the changed state will be set.
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {gf.graphics.DepthState=} opt_previousState Previous depth state.
 */
gf.graphics.DepthState.prototype.makeActive =
    function(gl, opt_previousState) {
  if (this == opt_previousState) {
    return;
  } else if (opt_previousState) {
    // Delta state
    this.makeActiveDelta_(gl, opt_previousState);
  } else {
    // No previous state - assume nothing and set all
    this.makeActiveFull_(gl);
  }
};


/**
 * Makes the depth state active, assuming nothing about previous state.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 */
gf.graphics.DepthState.prototype.makeActiveFull_ = function(gl) {
  if (this.depthTestEnabled) {
    gl.enable(goog.webgl.DEPTH_TEST);
  } else {
    gl.disable(goog.webgl.DEPTH_TEST);
  }
  gl.depthFunc(this.depthFunc);
  gl.depthRange(this.depthRangeNear, this.depthRangeFar);
  gl.depthMask(this.depthMask);

  if (this.polygonOffsetEnabled) {
    gl.enable(goog.webgl.POLYGON_OFFSET_FILL);
  } else {
    gl.disable(goog.webgl.POLYGON_OFFSET_FILL);
  }
  gl.polygonOffset(this.polygonOffsetFactor, this.polygonOffsetUnits);
};


/**
 * Makes the depth state active, performing the delta between the new
 * and previous states.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {!gf.graphics.DepthState} previousState Previous depth state.
 */
gf.graphics.DepthState.prototype.makeActiveDelta_ =
    function(gl, previousState) {
  if (this.depthTestEnabled != previousState.depthTestEnabled) {
    if (this.depthTestEnabled) {
      gl.enable(goog.webgl.DEPTH_TEST);
    } else {
      gl.disable(goog.webgl.DEPTH_TEST);
    }
  }
  if (this.depthFunc != previousState.depthFunc) {
    gl.depthFunc(this.depthFunc);
  }
  if (this.depthRangeNear != previousState.depthRangeNear ||
      this.depthRangeFar != previousState.depthRangeFar) {
    gl.depthRange(this.depthRangeNear, this.depthRangeFar);
  }
  if (this.depthMask != previousState.depthMask) {
    gl.depthMask(this.depthMask);
  }

  if (this.polygonOffsetEnabled != previousState.polygonOffsetEnabled) {
    if (this.polygonOffsetEnabled) {
      gl.enable(goog.webgl.POLYGON_OFFSET_FILL);
    } else {
      gl.disable(goog.webgl.POLYGON_OFFSET_FILL);
    }
  }
  if (this.polygonOffsetFactor != previousState.polygonOffsetFactor ||
      this.polygonOffsetUnits != previousState.polygonOffsetUnits) {
    gl.polygonOffset(this.polygonOffsetFactor, this.polygonOffsetUnits);
  }
};


/**
 * Default depth state.
 * @type {!gf.graphics.DepthState}
 */
gf.graphics.DepthState.DEFAULT = new gf.graphics.DepthState();


/**
 * Depth state for simple less-than-or-equal depth testing.
 * @type {!gf.graphics.DepthState}
 */
gf.graphics.DepthState.LEQUAL = (function() {
  var state = new gf.graphics.DepthState();
  state.depthTestEnabled = true;
  state.depthFunc = goog.webgl.LEQUAL;
  return state;
})();
