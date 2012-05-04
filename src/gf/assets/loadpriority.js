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

goog.provide('gf.assets.LoadPriority');


/**
 * Loading priority classes.
 * @enum {number}
 */
gf.assets.LoadPriority = {
  /**
   * Load the asset immediately (bypass the queue).
   */
  IMMEDIATE: 0,

  /**
   * Loads the asset at a high priority.
   */
  HIGH: 10,

  /**
   * Loads the asset at a normal priority.
   */
  NORMAL: 50,

  /**
   * Loads the asset at a low priority.
   */
  LOW: 100,

  /**
   * Loads the asset at a very low priority.
   */
  IDLE: 1000
};
