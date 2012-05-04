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

goog.provide('gf.dom.EventType');

goog.require('goog.events');


/**
 * Event names for the dom namespace.
 * @enum {string}
 */
gf.dom.EventType = {
  /**
   * Fullscreen has either entered successfully or exited.
   */
  FULLSCREEN_CHANGED: goog.events.getUniqueId('fullscreen_changed'),

  /**
   * Device orientation changed.
   */
  ORIENTATION_CHANGED: goog.events.getUniqueId('orientation_changed')
};
