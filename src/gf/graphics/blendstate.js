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

goog.provide('gf.graphics.BlendState');

goog.require('goog.vec.Vec4');
goog.require('goog.webgl');



/**
 * Blend state settings.
 * Encapsulates state settings relating to blending.
 * State setting objects should be treated as immutable once defined. Create new
 * state setting objects and switch between them to change state.
 *
 * @constructor
 */
gf.graphics.BlendState = function() {
  /**
   * Whether blending is enabled.
   * Maps to gl.enable(BLEND) / gl.disable(BLEND).
   * @type {boolean}
   */
  this.blendEnabled = false;

  /**
   * RGB blend equation.
   * Maps to gl.blendEquationSeparate.
   * @type {number}
   */
  this.blendEquationRgb = goog.webgl.FUNC_ADD;

  /**
   * Alpha blend equation.
   * Maps to gl.blendEquationSeparate.
   * @type {number}
   */
  this.blendEquationAlpha = goog.webgl.FUNC_ADD;

  /**
   * Specifies how the the RGB blending factors are computed.
   * Maps to gl.blendFuncSeparate.
   * @type {number}
   */
  this.blendFuncSrcRgb = goog.webgl.ONE;

  /**
   * Specifies how the the RGB destination blending factors are computed.
   * Maps to gl.blendFuncSeparate.
   * @type {number}
   */
  this.blendFuncDstRgb = goog.webgl.ZERO;

  /**
   * Specifies how the the alpha blending factors are computed.
   * Maps to gl.blendFuncSeparate.
   * @type {number}
   */
  this.blendFuncSrcAlpha = goog.webgl.ONE;

  /**
   * Specifies how the the alpha destination blending factors are computed.
   * Maps to gl.blendFuncSeparate.
   * @type {number}
   */
  this.blendFuncDstAlpha = goog.webgl.ZERO;

  /**
   * Color value used when the blend functions are one of the constant types.
   * Maps to gl.blendColor.
   * @type {!goog.vec.Vec4.Type}
   */
  this.blendColor = goog.vec.Vec4.createFloat32();

  /**
   * Bitmask of RGBA channels that are enabled for writing.
   * Maps to gl.colorMask.
   * @type {number}
   */
  this.colorMask = gf.graphics.BlendState.ColorMask.RGBA;
};


/**
 * Component bit values for color masking.
 * @enum {number}
 */
gf.graphics.BlendState.ColorMask = {
  /** Red color component. */
  R: 0x1,
  /** Green color component. */
  G: 0x2,
  /** Blue color component. */
  B: 0x4,
  /** Alpha color component. */
  A: 0x8,

  /** RGB color components. */
  RGB: 0x7,
  /** RGBA color components. */
  RGBA: 0xF
};


/**
 * Makes the blend state active.
 * If a previous state is provided then only the changed state will be set.
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {gf.graphics.BlendState=} opt_previousState Previous blend state.
 */
gf.graphics.BlendState.prototype.makeActive = function(gl, opt_previousState) {
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
 * Makes the blend state active, assuming nothing about previous state.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 */
gf.graphics.BlendState.prototype.makeActiveFull_ = function(gl) {
  if (this.blendEnabled) {
    gl.enable(goog.webgl.BLEND);
  } else {
    gl.disable(goog.webgl.BLEND);
  }
  gl.blendEquationSeparate(this.blendEquationRgb, this.blendEquationAlpha);
  gl.blendFuncSeparate(
      this.blendFuncSrcRgb, this.blendFuncDstRgb,
      this.blendFuncSrcAlpha, this.blendFuncDstAlpha);
  gl.blendColor(
      this.blendColor[0], this.blendColor[1], this.blendColor[2],
      this.blendColor[3]);
  gl.colorMask(
      !!(this.colorMask & gf.graphics.BlendState.ColorMask.R),
      !!(this.colorMask & gf.graphics.BlendState.ColorMask.G),
      !!(this.colorMask & gf.graphics.BlendState.ColorMask.B),
      !!(this.colorMask & gf.graphics.BlendState.ColorMask.A));
};


/**
 * Makes the blend state active, performing the delta between the new and
 * previous states.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {!gf.graphics.BlendState} previousState Previous blend state.
 */
gf.graphics.BlendState.prototype.makeActiveDelta_ =
    function(gl, previousState) {
  if (this.blendEnabled != previousState.blendEnabled) {
    if (this.blendEnabled) {
      gl.enable(goog.webgl.BLEND);
    } else {
      gl.disable(goog.webgl.BLEND);
    }
  }
  if (this.blendEquationRgb != previousState.blendEquationRgb ||
      this.blendEquationAlpha != previousState.blendEquationAlpha) {
    gl.blendEquationSeparate(this.blendEquationRgb, this.blendEquationAlpha);
  }
  if (this.blendFuncSrcRgb != previousState.blendFuncSrcRgb ||
      this.blendFuncDstRgb != previousState.blendFuncDstRgb ||
      this.blendFuncSrcAlpha != previousState.blendFuncSrcAlpha ||
      this.blendFuncDstAlpha != previousState.blendFuncDstAlpha) {
    gl.blendFuncSeparate(
        this.blendFuncSrcRgb, this.blendFuncDstRgb,
        this.blendFuncSrcAlpha, this.blendFuncDstAlpha);
  }
  if (!goog.vec.Vec4.equals(this.blendColor, previousState.blendColor)) {
    gl.blendColor(
        this.blendColor[0], this.blendColor[1], this.blendColor[2],
        this.blendColor[3]);
  }
  if (this.colorMask != previousState.colorMask) {
    gl.colorMask(
        !!(this.colorMask & gf.graphics.BlendState.ColorMask.R),
        !!(this.colorMask & gf.graphics.BlendState.ColorMask.G),
        !!(this.colorMask & gf.graphics.BlendState.ColorMask.B),
        !!(this.colorMask & gf.graphics.BlendState.ColorMask.A));
  }
};


/**
 * Default blend state.
 * @type {!gf.graphics.BlendState}
 */
gf.graphics.BlendState.DEFAULT = new gf.graphics.BlendState();


/**
 * Blend state for simple additive alpha blending.
 * @type {!gf.graphics.BlendState}
 */
gf.graphics.BlendState.ALPHA_BLEND = (function() {
  var state = new gf.graphics.BlendState();
  state.blendEnabled = true;
  state.blendFuncDstRgb = goog.webgl.ONE_MINUS_SRC_ALPHA;
  state.blendFuncDstAlpha = goog.webgl.ONE_MINUS_SRC_ALPHA;
  return state;
})();
