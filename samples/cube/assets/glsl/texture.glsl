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

//#name TextureProgram
//#description Simple single texture mapping program

//! NAMESPACE=cube.assets.programs
//! CLASS=TextureProgram


//! COMMON

precision highp float;

varying vec2 v_texCoord;


//! VERTEX

uniform mat4 u_worldViewProjMatrix;

attribute vec3 a_position;
attribute vec2 a_texCoord;

void main() {
  gl_Position = u_worldViewProjMatrix * vec4(a_position, 1.0);
  v_texCoord = a_texCoord;
}


//! FRAGMENT

uniform sampler2D u_texSampler;

void main() {
  // If playing with the build server, this is fun to adjust to see
  // instant results
  vec4 adjust = vec4(1.0, 1.0, 1.0, 1.0);
  gl_FragColor = texture2D(u_texSampler, v_texCoord) * adjust;
}
