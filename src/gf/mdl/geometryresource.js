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

goog.provide('gf.mdl.GeometryResource');

goog.require('gf.graphics.Resource');
goog.require('gf.graphics.VertexArrayObject');
goog.require('goog.asserts');
goog.require('goog.webgl');



// TODO(benvanik): move to gf.graphics
/**
 * GPU geometry data.
 * A managed GPU resource backed by a static geometry data instance.
 *
 * @constructor
 * @extends {gf.graphics.Resource}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {!gf.mdl.GeometryData} geometryData Geometry data.
 */
gf.mdl.GeometryResource = function(graphicsContext, geometryData) {
  goog.base(this, graphicsContext);

  /**
   * Data used to create this resource.
   * @type {!gf.mdl.GeometryData}
   */
  this.geometryData = geometryData;

  /**
   * Attribute array buffer.
   * @private
   * @type {WebGLBuffer}
   */
  this.attributeBuffer_ = null;

  /**
   * Element array buffer.
   * @private
   * @type {WebGLBuffer}
   */
  this.elementBuffer_ = null;

  /**
   * Vertex array object for drawing.
   * @private
   * @type {gf.graphics.VertexArrayObject}
   */
  this.vao_ = null;
};
goog.inherits(gf.mdl.GeometryResource, gf.graphics.Resource);


/**
 * @override
 */
gf.mdl.GeometryResource.prototype.discard = function() {
  var gl = this.graphicsContext.gl;

  goog.dispose(this.vao_);
  this.vao_ = null;

  gl.deleteBuffer(this.attributeBuffer_);
  this.attributeBuffer_ = null;
  gl.deleteBuffer(this.elementBuffer_);
  this.elementBuffer_ = null;

  goog.base(this, 'discard');
};


/**
 * @override
 */
gf.mdl.GeometryResource.prototype.restore = function() {
  goog.base(this, 'restore');

  var gl = this.graphicsContext.gl;

  // Upload attribute array buffer
  goog.asserts.assert(!this.attributeBuffer_);
  this.attributeBuffer_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.attributeBuffer_);
  gl.bufferData(
      goog.webgl.ARRAY_BUFFER,
      this.geometryData.attributeData,
      goog.webgl.STATIC_DRAW);

  // Upload element array buffer
  goog.asserts.assert(!this.elementBuffer_);
  this.elementBuffer_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, this.elementBuffer_);
  gl.bufferData(
      goog.webgl.ELEMENT_ARRAY_BUFFER,
      this.geometryData.elementData,
      goog.webgl.STATIC_DRAW);

  // Create VAO
  goog.asserts.assert(!this.vao_);
  var vaoAttributes = [];
  // gf.graphics.VertexAttrib
  this.vao_ = new gf.graphics.VertexArrayObject(this.graphicsContext,
      vaoAttributes, this.elementBuffer_);
};
