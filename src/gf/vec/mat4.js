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

goog.provide('gf.vec.Mat4');


/**
 * @fileoverview Adds some missing methods to the {@see goog.vec.Mat4}
 * type. These really should be moved into there, but are here until I feel like
 * writing unit tests.
 *
 * TODO(benvanik): move these helpers into Closure
 */


/**
 * Scales a matrix using matrix multiplication, storing the result into
 * resultMat.
 * Equivalent to:
 * <code>
 * goog.vec.Mat4.makeScale(mat1, x, y, z);
 * goog.vec.Mat4.multMat(mat0, mat1, resultMat);
 * </code>
 *
 * @param {goog.vec.Mat4.AnyType} mat The first (left hand) matrix.
 * @param {number} x The scale along the x axis (right hand matrix).
 * @param {number} y The scale along the y axis (right hand matrix).
 * @param {number} z The scale along the z axis (right hand matrix).
 * @param {goog.vec.Mat4.AnyType} resultMat The matrix to receive
 *     the results (may be mat).
 * @return {goog.vec.Mat4.AnyType} return resultMat so that operations can be
 *     chained together.
 */
gf.vec.Mat4.multScalePost = function(mat, x, y, z, resultMat) {
  var a00 = mat[0], a10 = mat[1], a20 = mat[2], a30 = mat[3];
  var a01 = mat[4], a11 = mat[5], a21 = mat[6], a31 = mat[7];
  var a02 = mat[8], a12 = mat[9], a22 = mat[10], a32 = mat[11];
  var a03 = mat[12], a13 = mat[13], a23 = mat[14], a33 = mat[15];

  resultMat[0] = a00 * x;
  resultMat[1] = a10 * x;
  resultMat[2] = a20 * x;
  resultMat[3] = a30 * x;

  resultMat[4] = a01 * y;
  resultMat[5] = a11 * y;
  resultMat[6] = a21 * y;
  resultMat[7] = a31 * y;

  resultMat[8] = a02 * z;
  resultMat[9] = a12 * z;
  resultMat[10] = a22 * z;
  resultMat[11] = a32 * z;

  resultMat[12] = a03;
  resultMat[13] = a13;
  resultMat[14] = a23;
  resultMat[15] = a33;

  return resultMat;
};


/**
 * Translates a matrix using multiplication, storing the result into resultMat.
 * Equivalent to:
 * <code>
 * goog.vec.Mat4.makeTranslate(mat0, x, y, z);
 * goog.vec.Mat4.multMat(mat0, mat1, resultMat);
 * </code>
 *
 * @param {number} x The translation along the x axis (left hand matrix).
 * @param {number} y The translation along the y axis (left hand matrix).
 * @param {number} z The translation along the z axis (left hand matrix).
 * @param {goog.vec.Mat4.AnyType} mat The second (right hand) matrix.
 * @param {goog.vec.Mat4.AnyType} resultMat The matrix to receive
 *     the results (may be mat).
 * @return {goog.vec.Mat4.AnyType} return resultMat so that operations can be
 *     chained together.
 */
gf.vec.Mat4.multTranslationPre = function(x, y, z, mat, resultMat) {
  var b00 = mat[0], b10 = mat[1], b20 = mat[2], b30 = mat[3];
  var b01 = mat[4], b11 = mat[5], b21 = mat[6], b31 = mat[7];
  var b02 = mat[8], b12 = mat[9], b22 = mat[10], b32 = mat[11];
  var b03 = mat[12], b13 = mat[13], b23 = mat[14], b33 = mat[15];

  resultMat[0] = b00 + x * b30;
  resultMat[1] = b10 + y * b30;
  resultMat[2] = b20 + z * b30;
  resultMat[3] = b30;

  resultMat[4] = b01 + x * b31;
  resultMat[5] = b11 + y * b31;
  resultMat[6] = b21 + z * b31;
  resultMat[7] = b31;

  resultMat[8] = b02 + x * b32;
  resultMat[9] = b12 + y * b32;
  resultMat[10] = b22 + z * b32;
  resultMat[11] = b32;

  resultMat[12] = b03 + x * b33;
  resultMat[13] = b13 + y * b33;
  resultMat[14] = b23 + z * b33;
  resultMat[15] = b33;

  return resultMat;
};


/**
 * Multiplies the two matrices mat0 and mat1 using matrix multiplication,
 * storing the result into resultMat.
 *
 * @param {goog.vec.Mat4.AnyType} mat0 The first (left hand) matrix.
 * @param {number} mat0Offset Offset into mat0 the matrix starts at.
 * @param {goog.vec.Mat4.AnyType} mat1 The second (right hand) matrix.
 * @param {number} mat1Offset Offset into mat1 the matrix starts at.
 * @param {goog.vec.Mat4.AnyType} resultMat The matrix to receive
 *     the results (may be either mat0 or mat1).
 * @param {number} resultOffset Offset into resultMat the matrix starts at.
 */
gf.vec.Mat4.multMatOffset = function(
    mat0, mat0Offset, mat1, mat1Offset, resultMat, resultOffset) {
  var a00 = mat0[mat0Offset + 0], a10 = mat0[mat0Offset + 1];
  var a20 = mat0[mat0Offset + 2], a30 = mat0[mat0Offset + 3];
  var a01 = mat0[mat0Offset + 4], a11 = mat0[mat0Offset + 5];
  var a21 = mat0[mat0Offset + 6], a31 = mat0[mat0Offset + 7];
  var a02 = mat0[mat0Offset + 8], a12 = mat0[mat0Offset + 9];
  var a22 = mat0[mat0Offset + 10], a32 = mat0[mat0Offset + 11];
  var a03 = mat0[mat0Offset + 12], a13 = mat0[mat0Offset + 13];
  var a23 = mat0[mat0Offset + 14], a33 = mat0[mat0Offset + 15];

  var b00 = mat1[mat1Offset + 0], b10 = mat1[mat1Offset + 1];
  var b20 = mat1[mat1Offset + 2], b30 = mat1[mat1Offset + 3];
  var b01 = mat1[mat1Offset + 4], b11 = mat1[mat1Offset + 5];
  var b21 = mat1[mat1Offset + 6], b31 = mat1[mat1Offset + 7];
  var b02 = mat1[mat1Offset + 8], b12 = mat1[mat1Offset + 9];
  var b22 = mat1[mat1Offset + 10], b32 = mat1[mat1Offset + 11];
  var b03 = mat1[mat1Offset + 12], b13 = mat1[mat1Offset + 13];
  var b23 = mat1[mat1Offset + 14], b33 = mat1[mat1Offset + 15];

  resultMat[resultOffset + 0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
  resultMat[resultOffset + 1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
  resultMat[resultOffset + 2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
  resultMat[resultOffset + 3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

  resultMat[resultOffset + 4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
  resultMat[resultOffset + 5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
  resultMat[resultOffset + 6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
  resultMat[resultOffset + 7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

  resultMat[resultOffset + 8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
  resultMat[resultOffset + 9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
  resultMat[resultOffset + 10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
  resultMat[resultOffset + 11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

  resultMat[resultOffset + 12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
  resultMat[resultOffset + 13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
  resultMat[resultOffset + 14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
  resultMat[resultOffset + 15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;
};
