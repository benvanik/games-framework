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

goog.provide('gf.mdl.Model');
goog.provide('gf.mdl.ModelCreateFunction');
goog.provide('gf.mdl.ModelPart');
goog.require('gf.mdl');
goog.require('gf.mdl.Bone');
goog.require('gf.mdl.Instance');
goog.require('gf.mdl.PrimitiveType');
goog.require('gf.vec.BoundingBox');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.vec.Vec4');


/**
 * A function that creates a model.
 * @typedef {function(!gf.assets.AssetManager):!gf.mdl.Model}
 */
gf.mdl.ModelCreateFunction;



/**
 * A data-only representation of a model.
 * Contains all shared information across instances such as hit testing
 * volumes, vertices, skeletal data, and animation keyframes.
 *
 * Models should be treated as static; use instances to manipulate individual
 * instances of a model in the world. A model must not be changed once instances
 * have been created.
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {string} modelId Model ID.
 */
gf.mdl.Model = function(modelId) {
  goog.base(this);

  /**
   * Model ID.
   * @type {string}
   */
  this.id = modelId;

  /**
   * Axis-aligned bounding box.
   * @type {!gf.vec.BoundingBox}
   */
  this.boundingBox = gf.vec.BoundingBox.create();

  /**
   * Bounding sphere.
   * @type {!goog.vec.Vec4.Float32}
   */
  this.boundingSphere = goog.vec.Vec4.createFloat32();

  /**
   * Geometry data.
   * @private
   * @type {gf.mdl.GeometryData}
   */
  this.geometryData_ = null;

  /**
   * A list of model parts.
   * @private
   * @type {!Array.<!gf.mdl.ModelPart>}
   */
  this.parts_ = [];

  /**
   * Flattened list of bones.
   * Bones must be ordered such that parents preceed their children.
   * Bone instances have an index that must match the index into this array.
   * @private
   * @type {!Array.<!gf.mdl.Bone>}
   */
  this.bones_ = [];

  /**
   * A map of bones by name.
   * Only named bones are added to this map.
   * @private
   * @type {!Object.<!gf.mdl.Bone>}
   */
  this.bonesByName_ = {};

  // TODO(benvanik): animation list/etc
  // TODO(benvanik): attachment list
  // TODO(benvanik): center of mass, mass, other physics data
};
goog.inherits(gf.mdl.Model, goog.Disposable);


/**
 * Gets the model geometry data.
 * @return {!gf.mdl.GeometryData} Geometry data.
 */
gf.mdl.Model.prototype.getGeometryData = function() {
  goog.asserts.assert(this.geometryData_);
  return this.geometryData_;
};


/**
 * Sets the model geometry data.
 * The given value is not cloned and should not be modified after setting it
 * on a model.
 * @param {!gf.mdl.GeometryData} value New geometry data.
 */
gf.mdl.Model.prototype.setGeometryData = function(value) {
  goog.asserts.assert(!this.geometryData_);
  this.geometryData_ = value;
};


/**
 * Creates and adds a part to the model.
 * The part is created and added to the model with the default values.
 * @param {!gf.mdl.Material} material Material to draw with.
 * @return {!gf.mdl.ModelPart} New part.
 */
gf.mdl.Model.prototype.createPart = function(material) {
  var part = new gf.mdl.ModelPart(material);
  this.parts_.push(part);
  return part;
};


/**
 * Gets a list of all model parts.
 * @return {!Array.<!gf.mdl.ModelPart>} All parts.
 */
gf.mdl.Model.prototype.getParts = function() {
  return this.parts_;
};


/**
 * Creates and adds bone to the skeleton.
 * The bone is created and added to the model with default values.
 * @param {gf.mdl.Bone} parentBone Parent bone. Must already exist in the model.
 * @param {string=} opt_name Optional name for the bone.
 * @return {!gf.mdl.Bone} New bone.
 */
gf.mdl.Model.prototype.createBone = function(parentBone, opt_name) {
  goog.asserts.assert(this.bones_.length + 1 <= gf.mdl.MAX_BONES);

  var bone = new gf.mdl.Bone();
  bone.index = this.bones_.length;
  bone.name = opt_name || null;
  bone.parent = parentBone;
  if (parentBone) {
    parentBone.children.push(bone);
  }
  this.bones_.push(bone);
  if (opt_name) {
    this.bonesByName_[opt_name] = bone;
  }
  return bone;
};


/**
 * Gets a list of all bones.
 * The bones are in order with all parents followed by children.
 * @return {!Array.<!gf.mdl.Bone>} All bones.
 */
gf.mdl.Model.prototype.getBones = function() {
  return this.bones_;
};


/**
 * Gets the bone at the given index.
 * @param {number} boneIndex Bone index.
 * @return {!gf.mdl.Bone} The bone.
 */
gf.mdl.Model.prototype.getBone = function(boneIndex) {
  goog.asserts.assert(boneIndex < this.bones_.length);
  return this.bones_[boneIndex];
};


/**
 * Gets the bone with the given name.
 * @param {string} boneName Bone name.
 * @return {gf.mdl.Bone} The bone, if it exists.
 */
gf.mdl.Model.prototype.getBoneByName = function(boneName) {
  return this.bonesByName_[boneName] || null;
};


/**
 * Gets the root bone of the skeleton.
 * @return {!gf.mdl.Bone} Root bone.
 */
gf.mdl.Model.prototype.getRootBone = function() {
  goog.asserts.assert(this.bones_.length);
  return this.bones_[0];
};


/**
 * Creates an initialized model instance.
 * The model must not change once instances have been created.
 * @return {!gf.mdl.Instance} Model instance.
 */
gf.mdl.Model.prototype.createInstance = function() {
  return new gf.mdl.Instance(this);
};



/**
 * Model part.
 * Contains a material/geometry data pair for a model.
 * @constructor
 * @param {!gf.mdl.Material} material Model material.
 */
gf.mdl.ModelPart = function(material) {
  /**
   * Material used when drawing this part.
   * @type {!gf.mdl.Material}
   */
  this.material = material;

  /**
   * Primitive type.
   * @type {!gf.mdl.PrimitiveType}
   */
  this.primitiveType = gf.mdl.PrimitiveType.TRIANGLE_LIST;

  /**
   * The number of elements in this part.
   * @type {number}
   */
  this.elementCount = 0;

  /**
   * Starting index in the element array buffer.
   * @type {number}
   */
  this.elementOffset = 0;
};
