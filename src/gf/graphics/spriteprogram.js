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

goog.provide('gf.graphics.SpriteProgram');

goog.require('gf.graphics.Program');
goog.require('goog.asserts');
goog.require('goog.webgl');



/**
 * A WebGL program used for displaying 2D sprites.
 *
 * THIS IS DEPRECATED AND WILL BE REMOVED SOON
 *
 * @constructor
 * @extends {gf.graphics.Program}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 */
gf.graphics.SpriteProgram = function(graphicsContext) {
  goog.base(this, graphicsContext, 'sprite');

  /** @type {number} */
  this.a_position = -1;
  /** @type {number} */
  this.a_texCoord = -1;
  /** @type {number} */
  this.a_color = -1;

  /** @type {WebGLUniformLocation} */
  this.u_worldViewProjMatrix = null;
  /** @type {WebGLUniformLocation} */
  this.u_texSampler = null;
  /** @type {WebGLUniformLocation} */
  this.u_color = null;
};
goog.inherits(gf.graphics.SpriteProgram, gf.graphics.Program);


/**
 * Vertex shader source.
 * @private
 * @const
 * @type {string}
 */
gf.graphics.SpriteProgram.vertexShaderSource_ = [
  'uniform mat4 u_worldViewProjMatrix;',
  '',
  'attribute vec3 a_position;',
  'attribute vec2 a_texCoord;',
  'attribute vec4 a_color;',
  '',
  'varying vec2 v_texCoord;',
  'varying vec4 v_color;',
  '',
  'void main() {',
  '  gl_Position = u_worldViewProjMatrix * vec4(a_position, 1.0);',
  '  v_texCoord = a_texCoord;',
  '  v_color = a_color;',
  '}'
].join('\n');


/**
 * Fragment shader source.
 * @private
 * @const
 * @type {string}
 */
gf.graphics.SpriteProgram.fragmentShaderSource_ = [
  'precision mediump float;',
  '',
  'uniform sampler2D u_texSampler;',
  'uniform vec4 u_color;',
  '',
  'varying vec2 v_texCoord;',
  'varying vec4 v_color;',
  '',
  'void main() {',
  '  vec4 texColor = texture2D(u_texSampler, v_texCoord);',
  '  gl_FragColor = texColor * v_color * u_color;',
  '  if (gl_FragColor.a == 0.0) {',
  '    discard;',
  '  }',
  '}'
].join('\n');


/**
 * @override
 */
gf.graphics.SpriteProgram.prototype.discard = function() {
  this.a_position = -1;
  this.a_texCoord = -1;
  this.a_color = -1;

  this.u_worldViewProjMatrix = null;
  this.u_texSampler = null;
  this.u_color = null;

  goog.base(this, 'discard');
};


/**
 * @override
 */
gf.graphics.SpriteProgram.prototype.restore = function() {
  var gl = this.graphicsContext.gl;

  goog.base(this, 'restore');

  goog.asserts.assert(!this.program);

  // Create both shaders - do this regardless of failure so that we get both
  // info logs
  var vertexShader = this.createShader(goog.webgl.VERTEX_SHADER,
      gf.graphics.SpriteProgram.vertexShaderSource_);
  var fragmentShader = this.createShader(goog.webgl.FRAGMENT_SHADER,
      gf.graphics.SpriteProgram.fragmentShaderSource_);
  if (!vertexShader || !fragmentShader) {
    // One or more shaders failed to compile - abort
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return;
  }

  // Create program
  var program = this.createProgram(vertexShader, fragmentShader);

  // Always delete shader - they will be attached to the program (or not, if it
  // failed and was deleted)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  // Extract uniforms/attribs/etc
  if (program) {
    this.a_position = gl.getAttribLocation(program, 'a_position');
    this.a_texCoord = gl.getAttribLocation(program, 'a_texCoord');
    this.a_color = gl.getAttribLocation(program, 'a_color');

    this.u_worldViewProjMatrix =
        gl.getUniformLocation(program, 'u_worldViewProjMatrix');
    this.u_texSampler =
        gl.getUniformLocation(program, 'u_texSampler');
    this.u_color =
        gl.getUniformLocation(program, 'u_color');
  }

  this.program = program;
};
