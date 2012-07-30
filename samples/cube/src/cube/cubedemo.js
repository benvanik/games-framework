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

goog.provide('cube.CubeDemo');

goog.require('cube.Scene');
goog.require('gf.Game');
goog.require('gf.assets.AssetManager');
goog.require('gf.dom.Display');
goog.require('gf.dom.EventType');
goog.require('gf.graphics.EventType');
goog.require('gf.graphics.GraphicsContext');
goog.require('gf.input.Data');
goog.require('gf.input.InputManager');
goog.require('gf.input.MouseButton');
goog.require('gf.log');
goog.require('gf.vec.Viewport');
goog.require('goog.events.KeyCodes');



/**
 * Test game client instance.
 *
 * @constructor
 * @extends {gf.Game}
 * @param {!gf.LaunchOptions} launchOptions Game options.
 * @param {!goog.dom.DomHelper} dom DOM helper.
 */
cube.CubeDemo = function(launchOptions, dom) {
  goog.base(this, launchOptions);

  /**
   * DOM helper.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom;

  /**
   * Asset manager.
   * This handles loads of assets and their lifetime.
   * @private
   * @type {!gf.assets.AssetManager}
   */
  this.assetManager_ = new gf.assets.AssetManager(this, dom);
  this.registerDisposable(this.assetManager_);
  this.addComponent(this.assetManager_);

  /**
   * Display wrapper.
   * Creates the display DOM and manages things like orientation, fullscreen,
   * and resize.
   * @private
   * @type {!gf.dom.Display}
   */
  this.display_ = new gf.dom.Display(dom);
  this.registerDisposable(this.display_);
  this.setDisplayElement(this.display_.getVisibleElement());

  /**
   * WebGL graphics context.
   * Provides a slightly higher-level abstraction to WebGL (that can be ignored)
   * and resource management.
   * @private
   * @type {!gf.graphics.GraphicsContext}
   */
  this.graphicsContext_ = new gf.graphics.GraphicsContext(
      dom, this.display_.canvas.el);
  this.registerDisposable(this.graphicsContext_);

  /**
   * Input manager.
   * Normalizes various input mechanisms and provides a polling API.
   * @private
   * @type {!gf.input.InputManager}
   */
  this.input_ = new gf.input.InputManager(
      this, this.display_.getInputElement());
  this.registerDisposable(this.input_);
  this.addComponent(this.input_);

  /**
   * Input data storage.
   * @private
   * @type {!gf.input.Data}
   */
  this.inputData_ = new gf.input.Data(this.input_);

  /**
   * Current viewport.
   * @private
   * @type {!gf.vec.Viewport}
   */
  this.viewport_ = new gf.vec.Viewport();

  /**
   * The scene to be rendered.
   * @private
   * @type {!cube.Scene}
   */
  this.scene_ = new cube.Scene(
      this, this.assetManager_, this.graphicsContext_);
  this.registerDisposable(this.scene_);

  // Handle display events
  this.eh.listen(
      this.display_,
      gf.dom.EventType.ORIENTATION_CHANGED,
      function() {
        gf.log.write('device orientation changed: ', this.display_.orientation);
      });
  this.eh.listen(
      this.display_,
      gf.dom.EventType.FULLSCREEN_CHANGED,
      function() {
        if (this.display_.isFullScreen) {
          gf.log.write('entered fullscreen');
        } else {
          gf.log.write('exited fullscreen - now in normal window mode');
        }
      });

  // Handle graphics context events
  this.eh.listen(
      this.graphicsContext_,
      gf.graphics.EventType.CONTEXT_LOST,
      this.contextLost_);
  this.eh.listen(
      this.graphicsContext_,
      gf.graphics.EventType.CONTEXT_RESTORED,
      this.contextRestored_);

  // Bind to the special input fullscreen key combo and toggle fullscreen mode
  this.input_.keyboard.setFullScreenHandler(
      goog.bind(this.toggleFullscreen_, this));

  // Initialize the graphics systme
  // This is a deferred operation, so listen for the callback before continuing
  this.graphicsContext_.setup().addCallbacks(
      function() {
        // Setup resources and scene
        this.setupResources_();

        // Setup the toolbar UI
        this.setupToolbar_();
      },
      function(arg) {
        gf.log.write('failed to setup graphics context', arg);
        goog.global.alert('Unable to initialize WebGL');
      }, this);
};
goog.inherits(cube.CubeDemo, gf.Game);


/**
 * Adds a bit of toolbar UI for controlling modes.
 * @private
 */
cube.CubeDemo.prototype.setupToolbar_ = function() {
  // TODO(benvanik): toolbar UI
  // - this.display_.toggleFullscreen()
};


/**
 * Sets up the scene and kicks it off.
 * @private
 */
cube.CubeDemo.prototype.setupResources_ = function() {
  // Initial load
  this.scene_.setup();
};


/**
 * Handles WebGL context loss events.
 * @private
 */
cube.CubeDemo.prototype.contextLost_ = function() {
  // WebGL context was lost - drop unmanaged resources
  // If using types derived from gf.graphics.Resource, nothing need be done
};


/**
 * Handles WebGL context restore events.
 * @private
 */
cube.CubeDemo.prototype.contextRestored_ = function() {
  // WebGL context was restored after a loss - recreate/reupload unmanaged
  // resources
  // If using types derived from gf.graphics.Resource, nothing need be done
  // unless you have dynamically modified resources (buffer data uploads,
  // render-to-texture, etc)
};


/**
 * Toggles the fullscreen mode of the app.
 * @private
 */
cube.CubeDemo.prototype.toggleFullscreen_ = function() {
  // Toggle fullscreen mode
  var goingFullScreen = !this.display_.isFullScreen;
  this.display_.toggleFullScreen();

  // If going fullscreen and mouse lock is supported, enable it
  if (goingFullScreen && this.input_.mouse.supportsLocking) {
    this.input_.mouse.lock();
  }
};


/**
 * @override
 */
cube.CubeDemo.prototype.update = function(frame) {
  // Update networking/game logic/physics/etc
};


/**
 * @override
 */
cube.CubeDemo.prototype.render = function(frame) {
  // Update viewport to the latest display size
  // Must be done first as this resets most viewport matrices/etc
  var viewport = this.viewport_;
  viewport.setSize(this.display_.getSize());

  // Grab the latest input data
  // After calling this, inputData will contain all deltas and states until now
  this.inputData_.poll();

  // Handle input events
  this.handleInput_(frame);

  // Update viewport matrices/etc now that the controller logic has been applied
  viewport.calculate();

  // Render the scene
  // Note that this is guarded by the if - if begin returns false then the
  // graphics context is not available for rendering (lost/etc)
  if (this.graphicsContext_.begin()) {
    this.scene_.render(frame, viewport);
    this.renderInputUI_(frame);
    this.graphicsContext_.end();
  }

  // Must be called at the end of the frame
  this.inputData_.reset();
};


/**
 * DX/DY for keyboard arrow key movement.
 * @private
 * @const
 * @type {number}
 */
cube.CubeDemo.KEYBOARD_MOVE_SPEED_ = 10;


/**
 * Handles local user input for the current frame.
 * @private
 * @param {!gf.RenderFrame} frame Current frame.
 */
cube.CubeDemo.prototype.handleInput_ = function(frame) {
  var keyboardData = this.inputData_.keyboard;
  var mouseData = this.inputData_.mouse;
  // TODO: gamepad/touch/etc

  if (keyboardData.didKeyGoDown(goog.events.KeyCodes.SPACE)) {
    // TODO(benvanik): reset camera
  }

  var dx = 0;
  var dy = 0;

  // Keyboard arrow keys
  if (keyboardData.isKeyDown(goog.events.KeyCodes.LEFT)) {
    dx -= cube.CubeDemo.KEYBOARD_MOVE_SPEED_;
  }
  if (keyboardData.isKeyDown(goog.events.KeyCodes.RIGHT)) {
    dx += cube.CubeDemo.KEYBOARD_MOVE_SPEED_;
  }
  if (keyboardData.isKeyDown(goog.events.KeyCodes.UP)) {
    dy -= cube.CubeDemo.KEYBOARD_MOVE_SPEED_;
  }
  if (keyboardData.isKeyDown(goog.events.KeyCodes.DOWN)) {
    dy += cube.CubeDemo.KEYBOARD_MOVE_SPEED_;
  }

  // Mouse move
  // Take movement when locked, otherwise require mouse down (drag)
  if (mouseData.isLocked) {
    // Locked - take moves directly
    dx += mouseData.dx;
    dy += mouseData.dy;
  } else {
    // Unlocked - only take deltas when the left mouse button is down
    if (mouseData.buttons & gf.input.MouseButton.LEFT) {
      dx += mouseData.dx;
      dy += mouseData.dy;
    }
  }

  // TODO(benvanik): gamepad stick

  // TODO(benvanik): touches

  if (dx || dy) {
    this.scene_.rotate(dx, dy);
  }
};


/**
 * Renders any input UI required.
 * For example, if a crosshair or on-screen touch controls are needed, you
 * could draw them here.
 * Assumes that {@see gf.graphics.GraphicsContext#begin} has been called.
 * @private
 * @param {!gf.RenderFrame} frame Current frame.
 */
cube.CubeDemo.prototype.renderInputUI_ = function(frame) {
  // If using mouse lock, draw a crosshair in the center of the screen
  if (this.inputData_.mouse.isLocked) {
    var x = this.viewport_.width / 2;
    var y = this.viewport_.height / 2;
    // TODO: draw a crosshair at (x, y)
  }

  // TODO: draw onscreen dpad/etc for touch UIs
};
