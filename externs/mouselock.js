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
 * @fileoverview Definitions for the mouse lock API.
 * @see https://developer.mozilla.org/en/API/Mouse_Lock_API
 * @externs
 */

// TODO(benvanik): swap for the new API when Chrome gets it
// /** @return {Element} */
// Document.prototype.pointerLockElement = function() {};
// /** @return {Element} */
// Document.prototype.mozPointerLockElement = function() {};
// /** @return {Element} */
// Document.prototype.webkitPointerLockElement = function() {};
// Document.prototype.exitPointerLock = function() {};
// Element.prototype.requestPointerLock = function() {};
// Element.prototype.mozRequestPointerLock = function() {};
// Element.prototype.webkitRequestPointerLock = function() {};

/** @constructor */
function PointerLock() {}
/** @type {boolean} */
PointerLock.prototype.isLocked;
/**
 * @param {!Element} target
 * @param {(function(): void)=} opt_successCallback
 * @param {(function(): void)=} opt_failureCallback
 */
PointerLock.prototype.lock =
    function(target, opt_successCallback, opt_failureCallback) {};
PointerLock.prototype.unlock = function() {};

/** @type {number} */
Event.prototype.movementX;
/** @type {number} */
Event.prototype.movementY;
/** @type {number} */
Event.prototype.mozMovementX;
/** @type {number} */
Event.prototype.mozMovementY;
/** @type {number} */
Event.prototype.webkitMovementX;
/** @type {number} */
Event.prototype.webkitMovementY;

/** @type {PointerLock|undefined} */
Navigator.prototype.pointer;
/** @type {PointerLock|undefined} */
Navigator.prototype.mozPointer;
/** @type {PointerLock|undefined} */
Navigator.prototype.webkitPointer;
