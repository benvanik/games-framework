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
   * @private
   * @type {WebGLShader}
   */
  this.vertexShader_ = null;

  /**
   * @private
   * @type {WebGLShader}
   */
  this.fragmentShader_ = null;

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

  if (this.vertexShader_) {
    gl.deleteShader(this.vertexShader_);
    this.vertexShader_ = null;
  }
  if (this.fragmentShader_) {
    gl.deleteShader(this.fragmentShader_);
    this.fragmentShader_ = null;
  }
  if (this.handle) {
    gl.deleteProgram(this.handle);
    this.handle = null;
  }

  goog.base(this, 'discard');
};


/**
 * @override
 */
gf.graphics.Program.prototype.restore = function() {
  // This method should only be used by the automated restore mechanism
  // Consumers should instead use beginRestoring and endRestoring.
  this.beginRestoring();
  this.endRestoring();
};


/**
 * Begins restoring the program content.
 * This should not block under Chrome (but will on other browsers), and many
 * different programs can be restoring simultaneously.
 */
gf.graphics.Program.prototype.beginRestoring = function() {
  var gl = this.graphicsContext.gl;

  // Can't restore without shaders
  if (!this.vertexShaderSource || !this.fragmentShaderSource) {
    return;
  }

  // Reset error logs
  this.infoLogs = null;

  // Create both shaders - do this regardless of failure so that we get both
  // info logs
  this.vertexShader_ = this.createShader(
      goog.webgl.VERTEX_SHADER,
      this.vertexShaderSource);
  this.fragmentShader_ = this.createShader(
      goog.webgl.FRAGMENT_SHADER,
      this.fragmentShaderSource);
  if (this.vertexShader_ && this.fragmentShader_) {
    // Create program
    this.handle = this.createProgram(this.vertexShader_, this.fragmentShader_);
  }
};


/**
 * Ends restoring the program content.
 * If the program or its shaders failed to compile or link then this will fail.
 * On all platforms this will be a blocking call.
 * @return {boolean} True if the restore was successful.
 */
gf.graphics.Program.prototype.endRestoring = function() {
  if (!this.verifyShader(goog.webgl.VERTEX_SHADER, this.vertexShader_) ||
      !this.verifyShader(goog.webgl.FRAGMENT_SHADER, this.fragmentShader_) ||
      !this.verifyProgram(this.handle)) {
    this.discard();
    return false;
  }
  return true;
};


/**
 * Creates a shader and compiles it.
 * This performs no error checking on the shader - use {@see #verifyShader}.
 * In order to get asynchronous compilation, try calling that in the future
 * instead of immediately after this function.
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

  if (goog.DEBUG) {
    var shaderName = this.name;
    switch (type) {
      case goog.webgl.VERTEX_SHADER:
        shaderName += ' (VS)';
        break;
      case goog.webgl.FRAGMENT_SHADER:
        shaderName += ' (FS)';
        break;
    }
    shader['displayName'] = shaderName;
  }

  // Set source
  gl.shaderSource(shader, source);

  // Attempt compile
  gl.compileShader(shader);

  return shader;
};


/**
 * Verifies a shader was compiled successfully.
 * @protected
 * @param {number} type Shader type enum value.
 * @param {WebGLShader} shader Previously-compiled WebGL shader.
 * @return {boolean} True if the shader is valid and compiled successfully.
 */
gf.graphics.Program.prototype.verifyShader = function(type, shader) {
  var gl = this.graphicsContext.gl;

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
    gf.log.write('shader ' + this.name + '/' + type + ':' + log);
  }

  // Check for compile failure
  return !!gl.getShaderParameter(shader, goog.webgl.COMPILE_STATUS);
};


/**
 * Creates and links a program with the given shaders.
 * This performs no error checking on the program - use {@see #verifyProgram}.
 * In order to get asynchronous linking, try calling that in the future
 * instead of immediately after this function.
 * @protected
 * @param {!WebGLShader} vertexShader Vertex shader.
 * @param {!WebGLShader} fragmentShader Fragment shader.
 * @return {WebGLProgram} Program, unless an error occurred.
 */
gf.graphics.Program.prototype.createProgram = function(
    vertexShader, fragmentShader) {
  var gl = this.graphicsContext.gl;

  // Create
  var handle = gl.createProgram();
  if (!handle) {
    return null;
  }

  if (goog.DEBUG) {
    handle['displayName'] = this.name;
  }

  // Attach shaders
  gl.attachShader(handle, vertexShader);
  gl.attachShader(handle, fragmentShader);

  // Bind attributes now (before linking)
  this.bindAttributes(handle);

  // Attempt linking
  gl.linkProgram(handle);

  return handle;
};


/**
 * Verifies a program was linked successfully.
 * @protected
 * @param {WebGLProgram} program Previously-linked WebGL program.
 * @return {boolean} True if the program is valid and linked successfully.
 */
gf.graphics.Program.prototype.verifyProgram = function(program) {
  var gl = this.graphicsContext.gl;

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
    gf.log.write('program ' + this.name + ':' + log);
  }

  // Check for link failure
  return !!gl.getProgramParameter(program, goog.webgl.LINK_STATUS);
};


/**
 * Binds attribute locations, if desired.
 * This is called after a program has had its shaders added to it but before
 * it has been linked.
 * @protected
 * @param {WebGLProgram} handle Unlinked WebGL program.
 */
gf.graphics.Program.prototype.bindAttributes = goog.nullFunction;


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
