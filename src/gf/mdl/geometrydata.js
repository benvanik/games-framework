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

goog.provide('gf.mdl.GeometryData');



// TODO(benvanik): move to gf.graphics
/**
 * Static geometry data.
 * This is a CPU-side copy of buffer data in a form that enables easy uploading
 * to the GPU. It does not depend on any client-specific types and can be used
 * on the server for non-rendering tasks such as per-polygon collision
 * detection.
 *
 * @constructor
 * @param {!Array.<!gf.mdl.GeometryData.Attribute>} attributes Attribute
 *     information.
 * @param {!ArrayBuffer} attributeData Attribute array buffer data.
 * @param {!Uint16Array} elementData Element array buffer data.
 */
gf.mdl.GeometryData = function(attributes, attributeData, elementData) {
  /**
   * Attributes.
   * @type {!Array.<!gf.mdl.GeometryData.Attribute>}
   */
  this.attributes = attributes;

  /**
   * Attribute array buffer data.
   * @type {!ArrayBuffer}
   */
  this.attributeData = attributeData;

  /**
   * Element array buffer data.
   * @type {!Uint16Array}
   */
  this.elementData = elementData;
};



/**
 * An attribute in the geometry data buffer.
 * @constructor
 * @param {number} size Number of components.
 * @param {gf.mdl.ComponentType} type Component type.
 * @param {boolean} normalized Whether to normalize data.
 * @param {number} stride Stride, in bytes.
 * @param {number} offset Offset, in bytes.
 */
gf.mdl.GeometryData.Attribute = function(
    size, type, normalized, stride, offset) {
  /**
   * Number of components in the attribute data.
   * @type {number}
   */
  this.size = size;

  /**
   * Attribute component type.
   * @type {gf.mdl.ComponentType}
   */
  this.type = type;

  /**
   * Whether the attribute data is to be normalized.
   * @type {boolean}
   */
  this.normalized = normalized;

  /**
   * Stride of each attribute index, in bytes.
   * @type {number}
   */
  this.stride = stride;

  /**
   * Offset into the buffer to begin at, in bytes.
   * @type {number}
   */
  this.offset = offset;
};
