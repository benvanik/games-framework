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

goog.provide('gf.graphics.GraphicsContext');
goog.provide('gf.graphics.GraphicsContext.RendererInfo');

goog.require('gf.graphics.EventType');
goog.require('gf.graphics.ExtensionCache');
goog.require('gf.graphics.ExtensionName');
goog.require('gf.graphics.FeatureDetector');
goog.require('gf.graphics.Program');
goog.require('gf.log');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.object');
goog.require('goog.webgl');



/**
 * Base type for render contexts.
 * This render context can be used directly to provide a 'null' renderer
 * that  will not display anything. This is be useful on servers, testing, etc.
 *
 * TODO(benvanik): benchmarking
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {goog.dom.DomHelper} dom DOM helper.
 * @param {!HTMLCanvasElement} canvas Target canvas.
 */
gf.graphics.GraphicsContext = function(dom, canvas) {
  goog.base(this);

  /**
   * DOM helper to use when creating elements/etc.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom || goog.dom.getDomHelper(canvas);

  /**
   * Target canvas.
   * @type {!HTMLCanvasElement}
   */
  this.canvas = canvas;

  /**
   * All resources registered in this context.
   * This should only be used for discard/restore behavior. Resources must be
   * owned and discarded by other places, otherwise this will leak them.
   * @private
   * @type {!Object.<!gf.graphics.Resource>}
   */
  this.allResources_ = {};

  /**
   * Total number of undisposed resources.
   * @private
   * @type {number}
   */
  this.livingResourceCount_ = 0;

  /**
   * Current rasterizer state setting block, if any.
   * @private
   * @type {gf.graphics.RasterizerState}
   */
  this.rasterizerState_ = null;

  /**
   * Current blend state setting block, if any.
   * @private
   * @type {gf.graphics.BlendState}
   */
  this.blendState_ = null;

  /**
   * Current depth state setting block, if any.
   * @private
   * @type {gf.graphics.DepthState}
   */
  this.depthState_ = null;

  /**
   * Current stencil state setting block, if any.
   * @private
   * @type {gf.graphics.StencilState}
   */
  this.stencilState_ = null;

  /**
   * Current VAO, if any.
   * @private
   * @type {gf.graphics.VertexArrayObject}
   */
  this.vertexBinding_ = null;

  /**
   * Current program, if any.
   * @private
   * @type {WebGLProgram}
   */
  this.program_ = null;

  /**
   * Active texture unit ordinal.
   * @private
   * @type {number}
   */
  this.activeUnit_ = 0;

  /**
   * Current texture binding information for each sampler unit.
   * @private
   * @type {!Array.<gf.graphics.Texture>}
   */
  this.textureBindings_ = new Array(0);

  /**
   * Current render target.
   * Null implies the default framebuffer.
   * @private
   * @type {gf.graphics.RenderTexture}
   */
  this.renderTarget_ = null;

  /**
   * A stack of render target bindings.
   * The top of the stack should always match the current render target.
   * @private
   * @type {!Array.<gf.graphics.RenderTexture>}
   */
  this.renderTargetStack_ = [null];

  /**
   * Event handler for context events.
   * @private
   * @type {!goog.events.EventHandler}
   */
  this.eh_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eh_);

  /**
   * Whether anything can be rendered.
   * This flag will be set to true when attempted renders will succeed.
   * Otherwise one should not spend time drawing.
   * This flag will go false when the context is lost, and go back on when
   * it has been restored.
   * @type {boolean}
   */
  this.canRender = false;

  // Watch for creation errors - we will get null back for the getContext
  // if GL failed, but this will give us a status message
  this.eh_.listen(canvas, 'webglcontextcreationerror',
      /**
       * @this {gf.graphics.GraphicsContext}
       * @param {!WebGLContextEvent} e Event.
       */
      function(e) {
        gf.log.write('error creating gl context: ', e.statusMessage || '?');
      });

  // Setup context loss/restore handlers
  this.eh_.listen(canvas, 'webglcontextlost',
      /**
       * @this {gf.graphics.GraphicsContext}
       * @param {!WebGLContextEvent} e Event.
       */
      function(e) {
        e.preventDefault();

        // Discard all resources
        this.discard();

        this.dispatchEvent(gf.graphics.EventType.CONTEXT_LOST);
      });
  this.eh_.listen(canvas, 'webglcontextrestored',
      /**
       * @this {gf.graphics.GraphicsContext}
       * @param {!WebGLContextEvent} e Event.
       */
      function(e) {
        // Restore all resources
        this.restore();

        this.dispatchEvent(gf.graphics.EventType.CONTEXT_RESTORED);
      });

  /**
   * WebGL context.
   * Initialized by calling {@see gf.graphics.GraphicsContext#setup}.
   * @type {WebGLRenderingContext}
   */
  this.gl = null;

  /**
   * Extension cache.
   * Should always be used for enabling/accessing extensions to ensure fast and
   * small code.
   * Initialized by calling {@see gf.graphics.GraphicsContext#setup}.
   * @type {!gf.graphics.ExtensionCache}
   */
  this.extensions = new gf.graphics.ExtensionCache();

  /**
   * Feature support.
   * @type {!gf.graphics.FeatureDetector}
   */
  this.features = new gf.graphics.FeatureDetector(this);
};
goog.inherits(gf.graphics.GraphicsContext, goog.events.EventTarget);


/**
 * @override
 */
gf.graphics.GraphicsContext.prototype.disposeInternal = function() {
  // All resources should have already been removed, but just in case discard
  // them all and remove so that they will be GCed
  if (this.livingResourceCount_) {
    goog.object.forEach(this.allResources_, goog.dispose);
  }
  this.allResources_ = {};

  this.discard();

  goog.base(this, 'disposeInternal');
};


/**
 * Registers a resource to the context.
 * This is an internal method called by resource types. Do not use.
 * @param {!gf.graphics.Resource} resource Resource to register.
 */
gf.graphics.GraphicsContext.prototype.registerResource = function(resource) {
  goog.asserts.assert(
      !goog.object.containsKey(this.allResources_, resource.resourceId));
  this.allResources_[resource.resourceId] = resource;
  this.livingResourceCount_++;
};


/**
 * Unregisters a resource from the context.
 * This is an internal method called by resource types. Do not use.
 * @param {!gf.graphics.Resource} resource Resource to unregister.
 */
gf.graphics.GraphicsContext.prototype.unregisterResource = function(resource) {
  goog.asserts.assert(this.livingResourceCount_);
  goog.asserts.assert(
      goog.object.containsKey(this.allResources_, resource.resourceId));
  goog.object.remove(this.allResources_, resource.resourceId);
  this.livingResourceCount_--;
};


/**
 * Discards all resources.
 * Call this in the event of a context loss to discard any resource data that
 * needs to be restored.
 */
gf.graphics.GraphicsContext.prototype.discard = function() {
  // Set the loss flag to prevent further drawing
  this.canRender = false;

  goog.object.forEach(this.allResources_,
      /**
       * @param {!gf.graphics.Resource} resource Resource.
       */
      function(resource) {
        resource.discard();
      });

  // Drop all state caches, as on restore they will be the defaults
  this.invalidateState();
};


/**
 * Restores all resources.
 * Call this once a context has been restored to reload resource data that was
 * previously discarded.
 */
gf.graphics.GraphicsContext.prototype.restore = function() {
  // TODO(benvanik): anything required on the gl context
  var gl = this.gl;

  // Reset texture bindings
  var maxTextures = gl.getParameter(goog.webgl.MAX_TEXTURE_IMAGE_UNITS);
  this.textureBindings_ = new Array(maxTextures);
  for (var n = 0; n < this.textureBindings_.length; n++) {
    this.textureBindings_[n] = null;
  }

  // TODO(benvanik): sort by programs first

  goog.object.forEach(this.allResources_,
      /**
       * @param {!gf.graphics.Resource} resource Resource.
       */
      function(resource) {
        resource.restore();
      });

  // Ready for drawing again
  this.canRender = true;
};


/**
 * Attempts to get a WebGL context.
 * This is an asynchronous routine and may take some time (if the user must
 * be prompted, etc). If a context could not be created this will fail.
 * @param {WebGLContextAttributes=} opt_attributes Context attributes.
 * @return {!goog.async.Deferred} A deferred fulfilled when the context is ready
 *     for rendering.
 */
gf.graphics.GraphicsContext.prototype.setup = function(opt_attributes) {
  // Prevent multiple calls
  if (this.gl) {
    return goog.async.Deferred.succeed(null);
  }

  var deferred = new goog.async.Deferred();

  // Attempt to create WebGL
  // TODO(benvanik): async creation flow (for whenever that's implemented)
  var gl = this.createWebGL_(opt_attributes);
  if (gl) {
    this.gl = gl;

    // Setup extensions cache
    this.extensions.setup(gl);

    // Detect supported formats
    // This must be done before content restore, in case it's required
    this.features.detect().addCallbacks(
        function() {
          // Initial restore (sets us up for rendering)
          // Sets the canRender flag to true
          this.restore();

          deferred.callback(null);
        },
        function(arg) {
          deferred.errback(arg);
        }, this);
  } else {
    this.canRender = false;

    // TODO(benvanik): hold onto this deferred and issue the errback on the
    // webglcontextcreationerror event... unfortunately it doesn't seem well
    // implemented so it can't be relied upon yet
    deferred.errback(null);
  }

  return deferred;
};


/**
 * Creates a WebGL context for use.
 * @private
 * @param {WebGLContextAttributes=} opt_attributes Context attributes.
 * @return {WebGLRenderingContext} WebGL rendering context.
 */
gf.graphics.GraphicsContext.prototype.createWebGL_ = function(opt_attributes) {
  // Quick check
  if (!goog.global['WebGLRenderingContext']) {
    return null;
  }

  var gl = null;

  // Attempt creation
  var names = ['webgl', 'experimental-webgl'];
  for (var n = 0; n < names.length; n++) {
    try {
      gl = /** @type {WebGLRenderingContext} */ (
          this.canvas.getContext(names[n], opt_attributes));
    } catch (e) {
      continue;
    }
    if (gl) {
      break;
    }
  }

  return gl;
};


/**
 * Information about the graphics renderer.
 * @typedef {{
 *   vendor: string,
 *   renderer: string
 * }}
 */
gf.graphics.GraphicsContext.RendererInfo;


/**
 * Gets information about the renderer.
 * This must only be called once the context has been initialized, and may not
 * always work. Use only for debugging/diagnostics.
 *
 * This uses the WEBGL_debug_renderer_info extension, which has a very
 * restricted implementation. Currently only extensions or apps on Chrome can
 * use this.
 * http://www.khronos.org/registry/webgl/extensions/WEBGL_debug_renderer_info/
 *
 * @return {gf.graphics.GraphicsContext.RendererInfo?} Renderer information,
 *     if available.
 */
gf.graphics.GraphicsContext.prototype.getRendererInfo = function() {
  if (!this.extensions.get(
      gf.graphics.ExtensionName.WEBGL_debug_renderer_info)) {
    return null;
  }

  var gl = this.gl;
  return {
    vendor: /** @type {string} */ (
        gl.getParameter(goog.webgl.UNMASKED_VENDOR_WEBGL)),
    renderer: /** @type {string} */ (
        gl.getParameter(goog.webgl.UNMASKED_RENDERER_WEBGL))
  };
};


/**
 * Flushes all pending operations to the device.
 */
gf.graphics.GraphicsContext.prototype.flush = function() {
  this.gl.flush();
};


/**
 * Invalidates all state caches.
 * This should be called before making manual modifications to the GL state to
 * ensure that
 * If possible, use a specific state group (such as blend or depth/stencil)
 * setter to invalidate just those states, preventing the need for a full state
 * reset.
 */
gf.graphics.GraphicsContext.prototype.invalidateState = function() {
  this.rasterizerState_ = null;
  this.blendState_ = null;
  this.depthState_ = null;
  this.stencilState_ = null;
  if (this.vertexBinding_) {
    this.vertexBinding_.reset();
    this.vertexBinding_ = null;
  }

  this.program_ = null;

  this.activeUnit_ = 0;
  for (var n = 0; n < this.textureBindings_.length; n++) {
    this.textureBindings_[n] = null;
  }

  this.renderTarget_ = null;
};


/**
 * Gets the current rasterizer state settings, if any.
 * @return {gf.graphics.RasterizerState} State settings, if set.
 */
gf.graphics.GraphicsContext.prototype.getRasterizerState = function() {
  return this.rasterizerState_;
};


/**
 * Sets new rasterizer state settings.
 * If null is provided then the cached settings will be dropped.
 * @param {gf.graphics.RasterizerState} state New state, or null to invalidate.
 */
gf.graphics.GraphicsContext.prototype.setRasterizerState = function(state) {
  if (this.rasterizerState_ != state) {
    if (state && this.gl) {
      state.makeActive(this.gl, this.rasterizerState_);
    }
    this.rasterizerState_ = state;
  }
};


/**
 * Gets the current blend state settings, if any.
 * @return {gf.graphics.BlendState} State settings, if set.
 */
gf.graphics.GraphicsContext.prototype.getBlendState = function() {
  return this.blendState_;
};


/**
 * Sets new blend state settings.
 * If null is provided then the cached settings will be dropped.
 * @param {gf.graphics.BlendState} state New state, or null to invalidate.
 */
gf.graphics.GraphicsContext.prototype.setBlendState = function(state) {
  if (this.blendState_ != state) {
    if (state && this.gl) {
      state.makeActive(this.gl, this.blendState_);
    }
    this.blendState_ = state;
  }
};


/**
 * Gets the current depth state settings, if any.
 * @return {gf.graphics.DepthState} State settings, if set.
 */
gf.graphics.GraphicsContext.prototype.getDepthState = function() {
  return this.depthState_;
};


/**
 * Sets new depth state settings.
 * If null is provided then the cached settings will be dropped.
 * @param {gf.graphics.DepthState} state New state, or null to invalidate.
 */
gf.graphics.GraphicsContext.prototype.setDepthState = function(state) {
  if (this.depthState_ != state) {
    if (state && this.gl) {
      state.makeActive(this.gl, this.depthState_);
    }
    this.depthState_ = state;
  }
};


/**
 * Gets the current stencil state settings, if any.
 * @return {gf.graphics.StencilState} State settings, if set.
 */
gf.graphics.GraphicsContext.prototype.getStencilState = function() {
  return this.stencilState_;
};


/**
 * Sets new stencil state settings.
 * If null is provided then the cached settings will be dropped.
 * @param {gf.graphics.StencilState} state New state, or null to invalidate.
 */
gf.graphics.GraphicsContext.prototype.setStencilState = function(state) {
  if (this.stencilState_ != state) {
    if (state && this.gl) {
      state.makeActive(this.gl, this.stencilState_);
    }
    this.stencilState_ = state;
  }
};


/**
 * Gets the current vertex attribute binding, if any.
 * @return {gf.graphics.VertexArrayObject} State settings, if set.
 */
gf.graphics.GraphicsContext.prototype.getVertexBinding = function() {
  return this.vertexBinding_;
};


/**
 * Sets a new vertex attribute binding.
 * If null is provided then the cached settings will be dropped.
 * @param {gf.graphics.VertexArrayObject} value New state, or null to reset.
 */
gf.graphics.GraphicsContext.prototype.setVertexBinding = function(value) {
  if (this.vertexBinding_ != value) {
    if (value) {
      value.makeActive(this.vertexBinding_);
    } else if (this.vertexBinding_) {
      this.vertexBinding_.reset();
    }
    this.vertexBinding_ = value;
  }
};


/**
 * Sets the active shader program.
 * If null is provided then the cached settings will be dropped.
 * @param {gf.graphics.Program|WebGLProgram} value New program, or null to
 *     reset.
 */
gf.graphics.GraphicsContext.prototype.setProgram = function(value) {
  var webglProgram = (value instanceof gf.graphics.Program) ?
      value.handle : value;

  if (this.program_ != webglProgram) {
    this.gl.useProgram(webglProgram);
    this.program_ = webglProgram;
  }
};


/**
 * Binds the given texture to a sampler unit.
 * @param {number} unit Sampler unit.
 * @param {gf.graphics.Texture} texture New texture binding.
 */
gf.graphics.GraphicsContext.prototype.setTexture =
    function(unit, texture) {
  var gl = this.gl;

  goog.asserts.assert(unit >= 0 && unit < this.textureBindings_.length);

  if (this.textureBindings_[unit] == texture) {
    return;
  }

  if (this.activeUnit_ != unit) {
    gl.activeTexture(goog.webgl.TEXTURE0 + unit);
    this.activeUnit_ = unit;
  }

  this.textureBindings_[unit] = texture;
  if (texture) {
    texture.bind();
  } else {
    this.gl.bindTexture(gl.TEXTURE_2D, null);
  }
};


/**
 * Pushes a render target for render-to-texture operations.
 * @param {gf.graphics.RenderTexture} renderTexture Target texture.
 */
gf.graphics.GraphicsContext.prototype.pushRenderTarget =
    function(renderTexture) {
  // Push to stack (regardless of whether set)
  this.renderTargetStack_.push(renderTexture);

  // Rebind framebuffer, if needed
  if (this.renderTarget_ != renderTexture) {
    this.renderTarget_ = renderTexture;
    renderTexture.bindRenderTarget();
  }
};


/**
 * Pops an existing texture for render-to-texture operations.
 */
gf.graphics.GraphicsContext.prototype.popRenderTarget = function() {
  // Pop from stack
  goog.asserts.assert(this.renderTargetStack_.length > 1);
  this.renderTargetStack_.length--;

  // Rebind framebuffer, if needed
  var renderTexture = this.renderTargetStack_[
      this.renderTargetStack_.length - 1];
  if (this.renderTarget_ != renderTexture) {
    this.renderTarget_ = renderTexture;
    if (renderTexture) {
      renderTexture.bindRenderTarget();
    } else {
      this.gl.bindFramebuffer(goog.webgl.FRAMEBUFFER, null);
    }
  }
};


/**
 * Begins a new scene.
 * @return {boolean} True if the context is valid and can be rendered to.
 */
gf.graphics.GraphicsContext.prototype.begin = function() {
  var gl = this.gl;

  // If the context is loss then prevent rendering
  if (!this.canRender) {
    return false;
  }

  // ?

  return true;
};


/**
 * Ends the current scene.
 */
gf.graphics.GraphicsContext.prototype.end = function() {
  goog.asserts.assert(this.renderTargetStack_.length == 1);
};
