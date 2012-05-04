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

goog.provide('gf.graphics.RasterizerState');

goog.require('goog.webgl');



/**
 * Rasterization state settings.
 * Encapsulates state settings relating to the rasterizer (viewport/framebuffer/
 * etc).
 * State setting objects should be treated as immutable once defined. Create new
 * state setting objects and switch between them to change state.
 *
 * Scissor and viewport settings are left out from here as they generally change
 * with much different semantics.
 * Line width is also omitted, as it may change frequently when drawing scenes.
 *
 * @constructor
 */
gf.graphics.RasterizerState = function() {
  /**
   * Whether dithering is enabled.
   * Maps to gl.enable(DITHER) / gl.disable(DITHER).
   * @type {boolean}
   */
  this.ditherEnabled = true;

  /**
   * Whether face culling is enabled.
   * Maps to gl.enable(CULL_FACE) / gl.disable(CULL_FACE).
   * @type {boolean}
   */
  this.cullFaceEnabled = false;

  /**
   * Specify whether front- or back-facing facets can be culled.
   * Maps to gl.cullFace.
   * @type {number}
   */
  this.cullFace = goog.webgl.BACK;

  /**
   * Specifies the orientation of front-facing polygons.
   * Maps to gl.frontFace.
   * @type {number}
   */
  this.frontFaceMode = goog.webgl.CCW;

  /**
   * Whether a fragment's coverage is ANDed with the temporary coverage value.
   * Maps to gl.enable(SAMPLE_COVERAGE) / gl.disable(SAMPLE_COVERAGE).
   * @type {boolean}
   */
  this.sampleCoverageEnabled = false;

  /**
   * Floating point sample coverage value in the range of [0-1].
   * Maps to gl.sampleCoverage.
   * @type {number}
   */
  this.sampleCoverageValue = 1;

  /**
   * Whether the coverage masks should be inverted.
   * Maps to gl.sampleCoverage.
   * @type {boolean}
   */
  this.sampleCoverageInvert = false;

  /**
   * Whether alpha values are factored into the coverage value.
   * Maps to gl.enable(SAMPLE_ALPHA_TO_COVERAGE) /
   *     gl.disable(SAMPLE_ALPHA_TO_COVERAGE).
   * @type {boolean}
   */
  this.sampleAlphaToCoverageEnabled = false;
};


/**
 * Makes the rasterizer state active.
 * If a previous state is provided then only the changed state will be set.
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {gf.graphics.RasterizerState=} opt_previousState Previous
 *     rasterizer state.
 */
gf.graphics.RasterizerState.prototype.makeActive =
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
 * Makes the rasterizer state active, assuming nothing about previous state.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 */
gf.graphics.RasterizerState.prototype.makeActiveFull_ = function(gl) {
  if (this.ditherEnabled) {
    gl.enable(goog.webgl.DITHER);
  } else {
    gl.disable(goog.webgl.DITHER);
  }

  if (this.cullFaceEnabled) {
    gl.enable(goog.webgl.CULL_FACE);
  } else {
    gl.disable(goog.webgl.CULL_FACE);
  }
  gl.cullFace(this.cullFace);
  gl.frontFace(this.frontFaceMode);

  if (this.sampleCoverageEnabled) {
    gl.enable(goog.webgl.SAMPLE_COVERAGE);
  } else {
    gl.disable(goog.webgl.SAMPLE_COVERAGE);
  }
  gl.sampleCoverage(this.sampleCoverageValue, this.sampleCoverageInvert);
  if (this.sampleAlphaToCoverageEnabled) {
    gl.enable(goog.webgl.SAMPLE_ALPHA_TO_COVERAGE);
  } else {
    gl.disable(goog.webgl.SAMPLE_ALPHA_TO_COVERAGE);
  }
};


/**
 * Makes the rasterizer state active, performing the delta between the new
 * and previous states.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {!gf.graphics.RasterizerState} previousState Previous rasterizer
 *     state.
 */
gf.graphics.RasterizerState.prototype.makeActiveDelta_ =
    function(gl, previousState) {
  if (this.ditherEnabled != previousState.ditherEnabled) {
    if (this.ditherEnabled) {
      gl.enable(goog.webgl.DITHER);
    } else {
      gl.disable(goog.webgl.DITHER);
    }
  }

  if (this.cullFaceEnabled != previousState.cullFaceEnabled) {
    if (this.cullFaceEnabled) {
      gl.enable(goog.webgl.CULL_FACE);
    } else {
      gl.disable(goog.webgl.CULL_FACE);
    }
  }
  if (this.cullFace != previousState.cullFace) {
    gl.cullFace(this.cullFace);
  }
  if (this.frontFaceMode != previousState.frontFaceMode) {
    gl.frontFace(this.frontFaceMode);
  }

  if (this.sampleCoverageEnabled != previousState.sampleCoverageEnabled) {
    if (this.sampleCoverageEnabled) {
      gl.enable(goog.webgl.SAMPLE_COVERAGE);
    } else {
      gl.disable(goog.webgl.SAMPLE_COVERAGE);
    }
  }
  if (this.sampleCoverageValue != previousState.sampleCoverageValue ||
      this.sampleCoverageInvert != previousState.sampleCoverageInvert) {
    gl.sampleCoverage(this.sampleCoverageValue, this.sampleCoverageInvert);
  }
  if (this.sampleAlphaToCoverageEnabled !=
      previousState.sampleAlphaToCoverageEnabled) {
    if (this.sampleAlphaToCoverageEnabled) {
      gl.enable(goog.webgl.SAMPLE_ALPHA_TO_COVERAGE);
    } else {
      gl.disable(goog.webgl.SAMPLE_ALPHA_TO_COVERAGE);
    }
  }
};


/**
 * Default rasterizer state.
 * @type {!gf.graphics.RasterizerState}
 */
gf.graphics.RasterizerState.DEFAULT = new gf.graphics.RasterizerState();


/**
 * Rastersizer state for back-face culling.
 * @type {!gf.graphics.RasterizerState}
 */
gf.graphics.RasterizerState.CULL_BACK_FACE = (function() {
  var state = new gf.graphics.RasterizerState();
  state.cullFaceEnabled = true;
  return state;
})();
