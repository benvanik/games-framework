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

goog.provide('cube.Scene');

goog.require('cube.assets.programs.TextureProgram');
goog.require('cube.assets.textures.Texture');
goog.require('gf.graphics.BlendState');
goog.require('gf.graphics.DepthState');
goog.require('gf.graphics.RasterizerState');
goog.require('gf.graphics.Resource');
goog.require('gf.graphics.VertexArrayObject');
goog.require('gf.graphics.VertexAttrib');
goog.require('gf.vec.Quaternion');
goog.require('goog.vec.Mat4');
goog.require('goog.vec.Quaternion');
goog.require('goog.webgl');



/**
 * A simple scene containing a cube.
 *
 * @constructor
 * @extends {gf.graphics.Resource}
 * @param {!gf.Runtime} runtime Current runtime.
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 */
cube.Scene = function(runtime, assetManager, graphicsContext) {
  goog.base(this, graphicsContext);

  /**
   * Texture used in the scene.
   * This is a managed resource and handles its own discard/restore/update.
   * @private
   * @type {gf.graphics.Texture}
   */
  // this.texture_ = cube.assets.textures.texture.create(
  //     assetManager, graphicsContext);
  this.texture_ = new cube.assets.textures.Texture(
      assetManager, graphicsContext);
  this.registerDisposable(this.texture_);
  this.texture_.setFilteringMode(
      goog.webgl.LINEAR, goog.webgl.LINEAR);

  /**
   * Shader program used in the scene.
   * This is a managed resource.
   * @private
   * @type {!cube.assets.programs.TextureProgram}
   */
  this.program_ = cube.assets.programs.TextureProgram.create(
      assetManager, graphicsContext);
  this.registerDisposable(this.program_);

  /**
   * A vertex array object for the cube.
   * VAOs are not managed and must be discarded/restored.
   * @private
   * @type {gf.graphics.VertexArrayObject}
   */
  this.cubeVao_ = null;

  /**
   * Cube vertex buffer.
   * @private
   * @type {WebGLBuffer}
   */
  this.cubeBuffer_ = null;

  /**
   * Cube index buffer.
   * @private
   * @type {WebGLBuffer}
   */
  this.cubeIndexBuffer_ = null;

  /**
   * World matrix.
   * @private
   * @type {!goog.vec.Mat4.Type}
   */
  this.worldMatrix_ = goog.vec.Mat4.createFloat32Identity();
  goog.vec.Mat4.makeTranslate(this.worldMatrix_, 0, 0, -5);

  /**
   * Rotation quaternion.
   * @private
   * @type {!goog.vec.Quaternion.Float32}
   */
  this.rotation_ = goog.vec.Quaternion.createFloat32FromValues(0, 0, 0, 1);

};
goog.inherits(cube.Scene, gf.graphics.Resource);


/**
 * @override
 */
cube.Scene.prototype.discard = function() {
  var gl = this.graphicsContext.gl;

  // Drop our GL resources
  gl.deleteBuffer(this.cubeBuffer_);
  this.cubeBuffer_ = null;
  gl.deleteBuffer(this.cubeIndexBuffer_);
  this.cubeIndexBuffer_ = null;
  goog.dispose(this.cubeVao_);
  this.cubeVao_ = null;

  goog.base(this, 'discard');
};


/**
 * Total size of each cube vertex, in bytes.
 * @private
 * @const
 * @type {number}
 */
cube.Scene.BYTES_PER_CUBE_VERTEX_ = 5 * 4;


/**
 * Number of indices per cube.
 * @private
 * @const
 * @type {number}
 */
cube.Scene.INDICES_PER_CUBE_ = 36;


/**
 * @override
 */
cube.Scene.prototype.restore = function() {
  var ctx = this.graphicsContext;
  var gl = this.graphicsContext.gl;
  goog.base(this, 'restore');

  // ctx.setProgram(this.program_);
  // gl.uniform1i(this.program_.u_texSampler, 0);

  // Create the cube buffers
  this.cubeBuffer_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.cubeBuffer_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, 0, 1,
    1, -1, 1, 1, 1,
    1, 1, 1, 1, 0,
    -1, 1, 1, 0, 0,

    -1, -1, -1, 1, 1,
    -1, 1, -1, 1, 0,
    1, 1, -1, 0, 0,
    1, -1, -1, 0, 1,

    -1, 1, -1, 0, 0,
    -1, 1, 1, 0, 1,
    1, 1, 1, 1, 1,
    1, 1, -1, 1, 0,

    -1, -1, -1, 1, 0,
    1, -1, -1, 0, 0,
    1, -1, 1, 0, 1,
    -1, -1, 1, 1, 1,

    1, -1, -1, 1, 1,
    1, 1, -1, 1, 0,
    1, 1, 1, 0, 0,
    1, -1, 1, 0, 1,

    -1, -1, -1, 0, 1,
    -1, -1, 1, 1, 1,
    -1, 1, 1, 1, 0,
    -1, 1, -1, 0, 0
  ]), goog.webgl.STATIC_DRAW);
  this.cubeIndexBuffer_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer_);
  gl.bufferData(goog.webgl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
    0, 1, 2,
    0, 2, 3,
    4, 5, 6,
    4, 6, 7,
    8, 9, 10,
    8, 10, 11,
    12, 13, 14,
    12, 14, 15,
    16, 17, 18,
    16, 18, 19,
    20, 21, 22,
    20, 22, 23
  ]), goog.webgl.STATIC_DRAW);
  this.cubeVao_ = new gf.graphics.VertexArrayObject(ctx, [
    new gf.graphics.VertexAttrib(
        0,//this.program_.a_position,
        this.cubeBuffer_,
        3,
        goog.webgl.FLOAT,
        false,
        cube.Scene.BYTES_PER_CUBE_VERTEX_,
        0),
    new gf.graphics.VertexAttrib(
        1,//this.program_.a_texCoord,
        this.cubeBuffer_,
        2,
        goog.webgl.FLOAT,
        false,
        cube.Scene.BYTES_PER_CUBE_VERTEX_,
        3 * 4)
  ], this.cubeIndexBuffer_);
};


/**
 * Performs initial resource setup.
 */
cube.Scene.prototype.setup = function() {
  this.texture_.load();
  this.program_.load();
};


/**
 * Rotates the world by the given amount.
 * @param {number} dx Rotation along X.
 * @param {number} dy Rotation along Y.
 */
cube.Scene.prototype.rotate = function(dx, dy) {
  var m = cube.Scene.tmpMat4_;
  var q = cube.Scene.tmpQuat_;
  gf.vec.Quaternion.makeEulerZYX(q, dx / 100, dy / 100, 0);
  goog.vec.Quaternion.concat(this.rotation_, q, this.rotation_);
  goog.vec.Quaternion.toRotationMatrix4(this.rotation_, m);
  goog.vec.Mat4.makeTranslate(this.worldMatrix_, 0, 0, -5);
  goog.vec.Mat4.multMat(this.worldMatrix_, m, this.worldMatrix_);
};


/**
 * Renders the scene to the current graphics context.
 * Assumes that {@see gf.graphics.GraphicsContext#begin} has been called.
 * @param {!gf.RenderFrame} frame Current frame.
 * @param {!gf.vec.Viewport} viewport Current viewport.
 */
cube.Scene.prototype.render = function(frame, viewport) {
  var ctx = this.graphicsContext;
  var gl = this.graphicsContext.gl;

  ctx.setRasterizerState(gf.graphics.RasterizerState.CULL_BACK_FACE);
  ctx.setBlendState(gf.graphics.BlendState.DEFAULT);
  ctx.setDepthState(gf.graphics.DepthState.LEQUAL);

  gl.viewport(0, 0, viewport.width, viewport.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1);
  gl.clear(goog.webgl.COLOR_BUFFER_BIT | goog.webgl.DEPTH_BUFFER_BIT);

  this.drawCube_(frame, viewport);
};


/**
 * Draws the cube.
 * @private
 * @param {!gf.RenderFrame} frame Current frame.
 * @param {!gf.vec.Viewport} viewport Current viewport.
 */
cube.Scene.prototype.drawCube_ = function(frame, viewport) {
  var ctx = this.graphicsContext;
  var gl = this.graphicsContext.gl;

  // Set program and texture
  ctx.setTexture(0, this.texture_);
  ctx.setProgram(this.program_);

  // Set the latest world-view-projection matrix
  var wvp = cube.Scene.tmpMat4_;
  goog.vec.Mat4.multMat(viewport.viewProjMatrix, this.worldMatrix_, wvp);
  gl.uniformMatrix4fv(this.program_.u_worldViewProjMatrix, false, wvp);

  // Set VAO and draw
  ctx.setVertexBinding(this.cubeVao_);
  gl.drawElements(
      goog.webgl.TRIANGLES,
      cube.Scene.INDICES_PER_CUBE_,
      goog.webgl.UNSIGNED_SHORT,
      0);
};


/**
 * Scratch matrix.
 * @private
 * @type {!goog.vec.Mat4.Type}
 */
cube.Scene.tmpMat4_ = goog.vec.Mat4.createFloat32();


/**
 * Scratch quaternion.
 * @private
 * @type {!goog.vec.Quaternion.Float32}
 */
cube.Scene.tmpQuat_ = goog.vec.Quaternion.createFloat32();
