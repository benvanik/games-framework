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

goog.provide('gf.dom.Display');

goog.require('gf.dom.EventType');
goog.require('gf.graphics');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.dom.ViewportSizeMonitor');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.math.Size');
goog.require('goog.style');



/**
 * Display manager.
 * Handles creation and ownership of DOM display roots and fullscreen mode.
 * When running headless you can still create a display, just pass no DOM
 * helper.
 *
 * TODO(benvanik): optional parent element (not full document)
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {!goog.dom.DomHelper} dom DOM helper.
 * @param {Element=} opt_parentElement Parent element. If omitted the document
 *     body will be used.
 */
gf.dom.Display = function(dom, opt_parentElement) {
  goog.base(this);

  /**
   * DOM helper.
   * @type {!goog.dom.DomHelper}
   */
  this.dom = dom;
  var doc = dom.getDocument();
  var body = doc.body;
  goog.asserts.assert(body);

  /**
   * Parent DOM element.
   * @type {!Element}
   */
  this.parentElement = opt_parentElement || body;

  /**
   * Event handler.
   * @private
   * @type {!goog.events.EventHandler}
   */
  this.eh_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eh_);

  // <parentElement>
  //   <mainFrame>
  //     <canvasParent>

  var mainFrame = dom.createElement(goog.dom.TagName.DIV);
  goog.style.setStyle(mainFrame, {
    'position': 'absolute',
    'left': 0,
    'top': 0,
    'right': 0,
    'bottom': 0
  });
  dom.appendChild(this.parentElement, mainFrame);

  var canvasParent = dom.createElement(goog.dom.TagName.DIV);
  goog.style.setStyle(canvasParent, {
    'position': 'absolute',
    'left': 0,
    'top': 0,
    'right': 0,
    'bottom': 0
  });
  dom.appendChild(mainFrame, canvasParent);

  /**
   * Main frame element.
   * @private
   * @type {!Element}
   */
  this.mainFrame_ = mainFrame;

  /**
   * <canvas> wrapper.
   * @type {!gf.dom.Display.Canvas}
   */
  this.canvas = new gf.dom.Display.Canvas(dom, canvasParent);
  this.registerDisposable(this.canvas);

  /**
   * Whether the display is visible.
   * @private
   * @type {boolean}
   */
  this.isVisible_ = true;

  /**
   * Whether full screen mode is supported.
   * @type {boolean}
   */
  this.fullScreenSupported = false;

  /**
   * Whether currently in full screen mode.
   * @type {boolean}
   */
  this.isFullScreen = false;

  /**
   * Display orientation, in degrees.
   * @type {gf.dom.Display.Orientation}
   */
  this.orientation = gf.dom.Display.Orientation.PORTRAIT;

  /**
   * The pixel ratio of the display, where 1 = medium density, 2 = high
   * density (retina/etc), and 0.75 = low density. Don't expect the number to
   * be exact, but instead try to target == 1 and > 1.
   * @see http://developer.android.com/guide/webapps/targeting.html
   * @type {number}
   */
  this.pixelRatio = goog.global['devicePixelRatio'] || 1;

  // Listen for resizes
  var vsm = goog.dom.ViewportSizeMonitor.getInstanceForWindow(dom.getWindow());
  this.eh_.listen(vsm, goog.events.EventType.RESIZE,
      /**
       * @this {gf.dom.Display}
       * @param {!goog.events.Event} e Event.
       */
      function(e) {
        this.layout();
      });

  // Listen for orientation change
  this.eh_.listen(dom.getDocument().body, 'orientationchange',
      goog.bind(function() {
        this.orientation = /** @type {gf.dom.Display.Orientation} */ (
            window['orientation']);
        this.layout();
        this.dispatchEvent(gf.dom.EventType.ORIENTATION_CHANGED);
      }, this));

  // Initial layout
  this.layout();

  // Fullscreen mode detection and event handling
  this.fullScreenSupported = !!(
      mainFrame.requestFullScreen ||
      mainFrame.mozRequestFullScreen ||
      mainFrame.webkitRequestFullScreen);
  if (this.fullScreenSupported) {
    if (doc.fullScreenEnabled !== undefined ||
        doc.mozFullScreenEnabled !== undefined) {
      this.fullScreenSupported =
          doc.fullScreenEnabled ||
          doc.mozFullScreenEnabled;
    }
  }
  if (this.fullScreenSupported) {
    this.eh_.listen(doc, [
      'fullscreenchange',
      'mozfullscreenchange',
      'webkitfullscreenchange'
    ], function() {
      this.isFullScreen =
          !!doc.fullScreenElement ||
          doc.mozFullScreen ||
          doc.webkitIsFullScreen;
      this.layout();
      this.dispatchEvent(gf.dom.EventType.FULLSCREEN_CHANGED);
    });
  }

  // We may already be fullscreen (if reloaded while fullscreen) - if so, set
  // fullscreen flag and emit the event so that the caller can be setup right
  // Note that we do this on a delay as most things expect that
  // goog.global.setTimeout(goog.bind(function() {
  //   this.isFullScreen = !!doc.fullScreenElement ||
  //       doc.mozFullScreen ||
  //       doc.webkitIsFullScreen;
  //   if (this.isFullScreen) {
  //     this.layout();
  //     this.dispatchEvent(gf.dom.EventType.FULLSCREEN_CHANGED);
  //   }
  // }, this), 50);
};
goog.inherits(gf.dom.Display, goog.events.EventTarget);


/**
 * Display orientation constants.
 * @enum {number}
 */
gf.dom.Display.Orientation = {
  /**
   * Portrait (default).
   */
  PORTRAIT: 0,
  /**
   * Landscape right, with the device rotated clockwise.
   */
  LANDSCAPE_RIGHT: -90,
  /**
   * Landscape left, with the device rotated counter-clockwise.
   */
  LANDSCAPE_LEFT: 90,
  /**
   * Upside-down portrait.
   */
  PORTRAIT_INVERTED: 180
};


/**
 * Gets the DOM element that owns the display and can be used to add overlays.
 * @return {!Element} The parent element of the element that is used for
 *     displaying content.
 */
gf.dom.Display.prototype.getDomElement = function() {
  return this.mainFrame_;
};


/**
 * Gets the DOM element that is responsible for display.
 * @return {!Element} An element that is used for displaying content.
 */
gf.dom.Display.prototype.getVisibleElement = function() {
  return this.canvas.el;
};


/**
 * Gets a DOM element that should be used when listening for input events.
 * @return {!Element} An element that can be used for input events.
 */
gf.dom.Display.prototype.getInputElement = function() {
  // This should really be this.canvas.el, but Firefox does not support the
  // pointer lock API on any element but the one used for the fullscreen enable.
  return this.mainFrame_;
};


/**
 * Gets the size of the canvas in pixels.
 * Note that the result is not a cloned copy and should not be modified.
 * @return {!goog.math.Size} Size of the canvas, in px.
 */
gf.dom.Display.prototype.getSize = function() {
  return this.canvas.size;
};


/**
 * @return {boolean} Whether the display is visible.
 */
gf.dom.Display.prototype.isVisible = function() {
  return this.isVisible_;
};


/**
 * Sets whether the display is visible.
 * @param {boolean} value True to show the display.
 */
gf.dom.Display.prototype.setVisible = function(value) {
  if (value == this.isVisible_) {
    return;
  }
  this.isVisible_ = value;
  goog.style.showElement(this.canvas.el, value);
};


/**
 * Performs layout on the display and its children.
 */
gf.dom.Display.prototype.layout = function() {
  this.canvas.layout();
};


/**
 * Toggles fullscreen mode.
 */
gf.dom.Display.prototype.toggleFullScreen = function() {
  if (this.isFullScreen) {
    this.exitFullScreen();
  } else {
    this.enterFullScreen();
  }
};


/**
 * Attempts to enter full screen mode.
 */
gf.dom.Display.prototype.enterFullScreen = function() {
  if (!this.fullScreenSupported) {
    return;
  }

  var el = this.mainFrame_;

  var requestFullScreen =
      el.requestFullScreen ||
      el.mozRequestFullScreen ||
      el.webkitRequestFullScreen;
  requestFullScreen.call(el, Element.ALLOW_KEYBOARD_INPUT);
};


/**
 * Exits full screen mode, if in it.
 */
gf.dom.Display.prototype.exitFullScreen = function() {
  if (!this.fullScreenSupported) {
    return;
  }

  var doc = this.dom.getDocument();

  var cancelFullScreen =
      doc.cancelFullScreen ||
      doc.mozCancelFullScreen ||
      doc.webkitCancelFullScreen;
  cancelFullScreen.call(doc);

  // Should definitely be going out of full screen now
  this.isFullScreen = false;
};



/**
 * Display canvas.
 *
 * TODO(benvanik): scaling (run at 50% resolution, etc)
 *
 * @constructor
 * @extends {goog.Disposable}
 * @param {!goog.dom.DomHelper} dom DOM helper.
 * @param {!Element} parentElement Element that will receive the canvas.
 */
gf.dom.Display.Canvas = function(dom, parentElement) {
  goog.base(this);

  /**
   * Parent DOM element.
   * @type {!Element}
   */
  this.parentElement = parentElement;

  /**
   * Canvas element.
   * @type {!HTMLCanvasElement}
   */
  this.el = /** @type {!HTMLCanvasElement} */ (
      dom.createElement(goog.dom.TagName.CANVAS));
  goog.style.setUnselectable(this.el, true);
  goog.style.setStyle(this.el, {
    'position': 'absolute',
    'left': 0,
    'top': 0,
    'right': 0,
    'bottom': 0,
    'cursor': 'crosshair',
    '-webkit-tap-highlight-color': 'rgba(0,0,0,0)',
    '-webkit-touch-callout': 'none'
  });
  dom.appendChild(parentElement, this.el);

  /**
   * Current size of the canvas, in pixels.
   * @type {!goog.math.Size}
   */
  this.size = new goog.math.Size(1, 1);
};
goog.inherits(gf.dom.Display.Canvas, goog.Disposable);


/**
 * Performs layout on the canvas.
 */
gf.dom.Display.Canvas.prototype.layout = function() {
  var size = goog.style.getSize(this.parentElement);
  var pixelRatio = gf.graphics.getDevicePixelRatio();
  this.el.width = size.width * pixelRatio;
  this.el.height = size.height * pixelRatio;
  goog.style.setStyle(this.el, {
    'width': size.width + 'px',
    'height': size.height + 'px'
  });
  this.size.width = size.width;
  this.size.height = size.height;
};
