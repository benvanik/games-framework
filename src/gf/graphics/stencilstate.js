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

goog.provide('gf.graphics.StencilState');

goog.require('goog.webgl');



/**
 * Stencil state settings.
 * Encapsulates state settings relating to the stencil buffer.
 * State setting objects should be treated as immutable once defined. Create new
 * state setting objects and switch between them to change state.
 *
 * @constructor
 */
gf.graphics.StencilState = function() {
  /**
   * Whether stencil testing is enabled.
   * Maps to gl.enable(STENCIL_TEST) / gl.disable(STENCIL_TEST).
   * @type {boolean}
   */
  this.stencilTestEnabled = false;

  /**
   * Front face stencil test function.
   * Maps to gl.stencilFuncSeparate.
   * @type {number}
   */
  this.stencilFuncFront = goog.webgl.ALWAYS;

  /**
   * Front face stencil test reference value.
   * Maps to gl.stencilFuncSeparate.
   * @type {number}
   */
  this.stencilRefFront = 0;

  /**
   * Front face stencil test mask.
   * Maps to gl.stencilFuncSeparate.
   * @type {number}
   */
  this.stencilFuncMaskFront = 0xFFFFFFFF;

  /**
   * Back face stencil test function.
   * Maps to gl.stencilFuncSeparate.
   * @type {number}
   */
  this.stencilFuncBack = goog.webgl.ALWAYS;

  /**
   * Back face stencil test reference value.
   * Maps to gl.stencilFuncSeparate.
   * @type {number}
   */
  this.stencilRefBack = 0;

  /**
   * Back face stencil test mask.
   * Maps to gl.stencilFuncSeparate.
   * @type {number}
   */
  this.stencilFuncMaskBack = 0xFFFFFFFF;

  /**
   * Front face stencil test fail operation.
   * Maps to gl.stencilOpSeparate.
   * @type {number}
   */
  this.stencilOpSFailFront = goog.webgl.KEEP;

  /**
   * Front face depth test fail operation.
   * Maps to gl.stencilOpSeparate.
   * @type {number}
   */
  this.stencilOpDPFailFront = goog.webgl.KEEP;

  /**
   * Front face depth test pass operation.
   * Maps to gl.stencilOpSeparate.
   * @type {number}
   */
  this.stencilOpDPPassFront = goog.webgl.KEEP;

  /**
   * Back face stencil test fail operation.
   * Maps to gl.stencilOpSeparate.
   * @type {number}
   */
  this.stencilOpSFailBack = goog.webgl.KEEP;

  /**
   * Back face depth test fail operation.
   * Maps to gl.stencilOpSeparate.
   * @type {number}
   */
  this.stencilOpDPFailBack = goog.webgl.KEEP;

  /**
   * Back face depth test pass operation.
   * Maps to gl.stencilOpSeparate.
   * @type {number}
   */
  this.stencilOpDPPassBack = goog.webgl.KEEP;

  /**
   * Front face stencil mask.
   * Maps to gl.stencilMaskSeparate.
   * @type {number}
   */
  this.stencilMaskFront = 0xFFFFFFFF;

  /**
   * Back face stencil mask.
   * Maps to gl.stencilMaskSeparate.
   * @type {number}
   */
  this.stencilMaskBack = 0xFFFFFFFF;
};


/**
 * Makes the stencil state active.
 * If a previous state is provided then only the changed state will be set.
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {gf.graphics.StencilState=} opt_previousState Previous stencil state.
 */
gf.graphics.StencilState.prototype.makeActive =
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
 * Makes the stencil state active, assuming nothing about previous state.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 */
gf.graphics.StencilState.prototype.makeActiveFull_ = function(gl) {
  if (this.stencilTestEnabled) {
    gl.enable(goog.webgl.STENCIL_TEST);
  } else {
    gl.disable(goog.webgl.STENCIL_TEST);
  }
  gl.stencilFuncSeparate(goog.webgl.FRONT,
      this.stencilFuncFront, this.stencilRefFront, this.stencilFuncMaskFront);
  gl.stencilFuncSeparate(goog.webgl.BACK,
      this.stencilFuncBack, this.stencilRefBack, this.stencilFuncMaskBack);
  gl.stencilOpSeparate(goog.webgl.FRONT,
      this.stencilOpSFailFront,
      this.stencilOpDPFailFront, this.stencilOpDPPassFront);
  gl.stencilOpSeparate(goog.webgl.BACK,
      this.stencilOpSFailBack,
      this.stencilOpDPFailBack, this.stencilOpDPPassBack);
  if (this.stencilMaskFront == this.stencilMaskBack) {
    gl.stencilMask(this.stencilMaskFront);
  } else {
    gl.stencilMaskSeparate(goog.webgl.FRONT, this.stencilMaskFront);
    gl.stencilMaskSeparate(goog.webgl.BACK, this.stencilMaskBack);
  }
};


/**
 * Makes the stencil state active, performing the delta between the new
 * and previous states.
 * @private
 * @param {!WebGLRenderingContext} gl WebGL context.
 * @param {!gf.graphics.StencilState} previousState Previous stencil state.
 */
gf.graphics.StencilState.prototype.makeActiveDelta_ =
    function(gl, previousState) {
  if (this.stencilTestEnabled != previousState.stencilTestEnabled) {
    if (this.stencilTestEnabled) {
      gl.enable(goog.webgl.STENCIL_TEST);
    } else {
      gl.disable(goog.webgl.STENCIL_TEST);
    }
  }
  if (this.stencilFuncFront != previousState.stencilFuncFront ||
      this.stencilRefFront != previousState.stencilRefFront ||
      this.stencilFuncMaskFront != previousState.stencilFuncMaskFront) {
    gl.stencilFuncSeparate(goog.webgl.FRONT,
        this.stencilFuncFront, this.stencilRefFront, this.stencilFuncMaskFront);
  }
  if (this.stencilFuncBack != previousState.stencilFuncBack ||
      this.stencilRefBack != previousState.stencilRefBack ||
      this.stencilFuncMaskBack != previousState.stencilFuncMaskBack) {
    gl.stencilFuncSeparate(goog.webgl.BACK,
        this.stencilFuncBack, this.stencilRefBack, this.stencilFuncMaskBack);
  }
  if (this.stencilOpSFailFront != previousState.stencilOpSFailFront ||
      this.stencilOpDPFailFront != previousState.stencilOpDPFailFront ||
      this.stencilOpDPPassFront != previousState.stencilOpDPPassFront) {
    gl.stencilOpSeparate(goog.webgl.FRONT,
        this.stencilOpSFailFront,
        this.stencilOpDPFailFront, this.stencilOpDPPassFront);
  }
  if (this.stencilOpSFailBack != previousState.stencilOpSFailBack ||
      this.stencilOpDPFailBack != previousState.stencilOpDPFailBack ||
      this.stencilOpDPPassBack != previousState.stencilOpDPPassBack) {
    gl.stencilOpSeparate(goog.webgl.BACK,
        this.stencilOpSFailBack,
        this.stencilOpDPFailBack, this.stencilOpDPPassBack);
  }
  if (this.stencilMaskFront != previousState.stencilMaskFront) {
    gl.stencilMaskSeparate(goog.webgl.FRONT, this.stencilMaskFront);
  }
  if (this.stencilMaskBack != previousState.stencilMaskBack) {
    gl.stencilMaskSeparate(goog.webgl.BACK, this.stencilMaskBack);
  }
};
