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

goog.provide('gf.graphics.Program');

goog.require('gf.graphics.Resource');
goog.require('gf.log');
goog.require('goog.webgl');



/**
 * Base WebGL program utility.
 * Subclass to provide creation and typed uniforms.
 *
 * @constructor
 * @extends {gf.graphics.Resource}
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context.
 * @param {string} name Human-friendly name for debugging.
 * @param {string=} opt_vertexShader Vertex shader source.
 * @param {string=} opt_fragmentShader Fragment shader source.
 */
gf.graphics.Program = function(graphicsContext, name,
    opt_vertexShader, opt_fragmentShader) {
  goog.base(this, graphicsContext);

  /**
   * Human-friendly name for debugging.
   * @type {string}
   */
  this.name = name;

  /**
   * Vertex shader source code.
   * @protected
   * @type {string?}
   */
  this.vertexShaderSource = opt_vertexShader || null;

  /**
   * Fragment shader source code.
   * @protected
   * @type {string?}
   */
  this.fragmentShaderSource = opt_fragmentShader || null;

  /**
   * WebGL program.
   * May be null if not yet loaded or discarded.
   * @type {WebGLProgram}
   */
  this.handle = null;

  /**
   * Error logs from compiling/linking, if an error occurred.
   * Note that there may be multiple log messages from the shaders/program.
   * @type {Array.<string>}
   */
  this.infoLogs = null;
};
goog.inherits(gf.graphics.Program, gf.graphics.Resource);


/**
 * Loads the program.
 */
gf.graphics.Program.prototype.load = function() {
  this.restore();
};


/**
 * @override
 */
gf.graphics.Program.prototype.discard = function() {
  var gl = this.graphicsContext.gl;
  gl.deleteProgram(this.handle);
  this.handle = null;

  goog.base(this, 'discard');
};


/**
 * @override
 */
gf.graphics.Program.prototype.restore = function() {
  var gl = this.graphicsContext.gl;

  goog.base(this, 'restore');

  // Can't restore without shaders
  if (!this.vertexShaderSource || !this.fragmentShaderSource) {
    return;
  }

  // It's ok if we have a handle - it'll be reused - just reset state
  this.infoLogs = null;

  if (this.handle) {
    gl.deleteProgram(this.handle);
    this.handle = null;
  }

  // Create both shaders - do this regardless of failure so that we get both
  // info logs
  var vertexShader = this.createShader(
      goog.webgl.VERTEX_SHADER,
      this.vertexShaderSource);
  var fragmentShader = this.createShader(
      goog.webgl.FRAGMENT_SHADER,
      this.fragmentShaderSource);
  if (!vertexShader || !fragmentShader) {
    // One or more shaders failed to compile - abort
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return;
  }

  // Create program
  var program = this.createProgram(vertexShader, fragmentShader);

  // Always delete shaders - they will be attached to the program (or not, if it
  // failed and was deleted)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  this.handle = program;
};


/**
 * Creates a shader and compiles it.
 * @protected
 * @param {number} type Shader type enum value.
 * @param {string} source Shader source code.
 * @return {WebGLShader} Shader, unless an error occurred.
 */
gf.graphics.Program.prototype.createShader = function(type, source) {
  var gl = this.graphicsContext.gl;

  // Create
  var shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  var shaderName = this.name;
  switch (type) {
    case goog.webgl.VERTEX_SHADER:
      shaderName += ' (VS)';
      break;
    case goog.webgl.FRAGMENT_SHADER:
      shaderName += ' (FS)';
      break;
  }
  shader.displayName = shaderName;

  // Set source
  gl.shaderSource(shader, source);

  // Attempt compile
  gl.compileShader(shader);

  // Always get logs - may have warnings
  var log = gl.getShaderInfoLog(shader);
  if (log && log.length) {
    this.infoLogs = this.infoLogs || [];
    var logLines = log.split('\n');
    for (var n = 0; n < logLines.length; n++) {
      var line = logLines[n];
      if (line.length) {
        this.infoLogs.push(line);
      }
    }

    // TODO(benvanik): better logging
    gf.log.write('shader ' + this.name + '/' + type + ':', log);
  }

  // Check for compile failure
  if (!gl.getShaderParameter(shader, goog.webgl.COMPILE_STATUS)) {
    // Failed!
    gl.deleteShader(shader);
    return null;
  }

  return shader;
};


/**
 * Creates and links a program with the given shaders.
 * @protected
 * @param {!WebGLShader} vertexShader Vertex shader.
 * @param {!WebGLShader} fragmentShader Fragment shader.
 * @return {WebGLProgram} Program, unless an error occurred.
 */
gf.graphics.Program.prototype.createProgram = function(
    vertexShader, fragmentShader) {
  var gl = this.graphicsContext.gl;

  // Create
  var program = gl.createProgram();
  if (!program) {
    return null;
  }
  program.displayName = this.name;

  // Attach shaders
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // Attempt linking
  gl.linkProgram(program);

  // Always get logs - may have warnings
  var log = gl.getProgramInfoLog(program);
  if (log && log.length) {
    this.infoLogs = this.infoLogs || [];
    var logLines = log.split('\n');
    for (var n = 0; n < logLines.length; n++) {
      var line = logLines[n];
      if (line.length) {
        this.infoLogs.push(line);
      }
    }

    // TODO(benvanik): better logging
    gf.log.write('program ' + this.name + ':', log);
  }

  // Check for link failure
  if (!gl.getProgramParameter(program, goog.webgl.LINK_STATUS)) {
    // Failed!
    gl.deleteProgram(program);
    return null;
  }

  return program;
};


/**
 * Attemps to read the translated shader source for the given shader type.
 * This must only be called once a Program has been initialized, and may not
 * always work. Use only for debugging/diagnostics.
 *
 * This uses the WEBGL_debug_shaders extension, which has a very restricted
 * implementation. Currently only extensions or apps on Chrome can use this.
 * http://www.khronos.org/registry/webgl/extensions/WEBGL_debug_shaders/
 *
 * @param {number} type Shader type enum value.
 * @return {string?} Translated shader source, if it's available.
 */
gf.graphics.Program.prototype.getTranslatedShaderSource = function(type) {
  var ctx = this.graphicsContext;
  var gl = this.graphicsContext.gl;
  var ext = ctx.extensions.get_WEBGL_debug_shaders();
  if (ext) {
    var shaders = gl.getAttachedShaders(this.handle);
    for (var n = 0; n < shaders.length; n++) {
      if (gl.getShaderParameter(shaders[n], goog.webgl.SHADER_TYPE) == type) {
        return ext.getTranslatedShaderSource(shaders[n]);
      }
    }
  }
  return null;
};
