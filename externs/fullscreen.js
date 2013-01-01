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
 * @fileoverview Definitions for the full screen API.
 * @see https://developer.mozilla.org/en/DOM/Using_full-screen_mode
 * @externs
 */

/** @type {boolean} */
Document.prototype.fullScreenEnabled;
/** @type {boolean} */
Document.prototype.mozFullScreenEnabled;

/** @type {Element} */
Document.prototype.fullScreenElement;
/** @type {Element} */
Document.prototype.mozFullscreenElement;
/** @type {Element} */
Document.prototype.mozFullScreenElement;
/** @type {boolean} */
Document.prototype.mozFullScreen;
/** @type {boolean} */
Document.prototype.webkitIsFullScreen;

/** @param {number=} opt_flags */
Element.prototype.requestFullScreen = function(opt_flags) {};
Element.prototype.mozRequestFullScreen = function() {};

Document.prototype.cancelFullScreen = function() {};
Document.prototype.mozCancelFullScreen = function() {};
Document.prototype.webkitCancelFullScreen = function() {};
