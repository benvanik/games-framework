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

goog.provide('gf.assets.DataSource');

goog.require('goog.array');



/**
 * Data source description.
 *
 * @constructor
 * @param {string} type MIME type.
 * @param {string} path Path relative to the containing metadata file.
 * @param {number} size Size of the file, in bytes.
 */
gf.assets.DataSource = function(type, path, size) {
  /**
   * MIME type.
   * @type {string}
   */
  this.type = type;

  /**
   * Path, relative to the containing metadata file.
   * @type {string}
   */
  this.path = path;

  /**
   * Size of the file, in bytes.
   * @type {number}
   */
  this.size = size;
};


/**
 * Loads a list of data sources from a JSON array.
 * @param {!Object} sourceList JSON source list.
 * @return {!Array.<!gf.assets.DataSource>} Data source list.
 */
gf.assets.DataSource.loadListFromJson = function(sourceList) {
  var list = [];
  if (!sourceList) {
    return list;
  }

  for (var n = 0; n < sourceList.length; n++) {
    var sourceJson = sourceList[n];
    list.push(new gf.assets.DataSource(
        sourceJson['type'],
        sourceJson['path'],
        Number(sourceJson['size'])));
  }

  return list;
};


/**
 * Compares two data sources by size ascending.
 * @private
 * @param {!gf.assets.DataSource} a First source.
 * @param {!gf.assets.DataSource} b Second source.
 * @return {number} Sort order.
 */
gf.assets.DataSource.compareBySize_ = function(a, b) {
  return a.size - b.size;
};


/**
 * Sorts a list of data sources by size ascending (smallest to largest).
 * @param {!Array.<!gf.assets.DataSource>} list Data source list.
 */
gf.assets.DataSource.sortBySize = function(list) {
  // Sort by size ascending
  goog.array.sort(list, gf.assets.DataSource.compareBySize_);
};
