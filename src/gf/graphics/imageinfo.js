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

goog.provide('gf.graphics.ImageFormat');
goog.provide('gf.graphics.ImageInfo');

goog.require('gf.assets.DataSource');
goog.require('gf.graphics.ExtensionName');
goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.string');
goog.require('goog.webgl');



/**
 * Basic metadata about an image and its data sources.
 * This information is used to load images and should not be trusted as a
 * description of the actual content inside of the images or how the underlying
 * loader will return the data.
 *
 * @constructor
 * @param {number} width Width of the image, in px.
 * @param {number} height Height of the image, in px.
 * @param {number} channels Bitmask of channels present in the image.
 * @param {!Array.<!Array.<!gf.assets.DataSource>>} levelsOfDetail A list of
 *     levels of detail.
 */
gf.graphics.ImageInfo = function(width, height, channels, levelsOfDetail) {
  /**
   * Native width of the image, in px.
   * @type {number}
   */
  this.width = width;

  /**
   * Native height of the image, in px.
   * @type {number}
   */
  this.height = height;

  /**
   * Bitmask of channels present in the image from
   * {@see gf.graphics.ImageInfo.Channels}.
   * This should not be used to detect the format of the image.
   * @type {number}
   */
  this.channels = channels;

  /**
   * A list of levels of detail, where index 0 is LOD0 (native size), 1 is
   * LOD1 (1/2 size), etc. Each LOD is an array of data sources that provide
   * imagery.
   * @type {!Array.<!Array.<!gf.assets.DataSource>>}
   */
  this.levelsOfDetail = levelsOfDetail;
};


/**
 * Parses the image info from the given JSON blob.
 * @param {Object} json JSON blob.
 * @return {!gf.graphics.ImageInfo} Parsed image info.
 */
gf.graphics.ImageInfo.loadFromJson = function(json) {
  /*
  {
    width: number,
    height: number,
    channels: number,
    levelsOfDetail: [
      [<data source>, ...], // LOD0
      [<data source>, ...]  // LOD1
    ]
  }
  */

  var width = Number(json['width']);
  var height = Number(json['height']);
  var channels = Number(json['channels']);

  var jsonLods = /** @type {Array} */ (json['levelsOfDetail']);
  var lods = new Array(jsonLods ? jsonLods.length : 0);
  if (jsonLods) {
    for (var n = 0; n < jsonLods.length; n++) {
      lods[n] = gf.assets.DataSource.loadListFromJson(jsonLods[n]);
    }
  }

  return new gf.graphics.ImageInfo(width, height, channels, lods);
};


/**
 * Whether the image has an alpha channel.
 * @return {boolean} True if an alpha channel is present.
 */
gf.graphics.ImageInfo.prototype.hasAlpha = function() {
  return !!(this.channels & gf.graphics.ImageInfo.Channels.A);
};


/**
 * Picks the best data source based on support and size.
 * @param {!gf.graphics.GraphicsContext} graphicsContext Graphics context that
 *     the image will be used in.
 * @param {number} levelOfDetail Level of detail to pick.
 * @return {gf.assets.DataSource} Best data source, if any are supported.
 */
gf.graphics.ImageInfo.prototype.getBestDataSource =
    function(graphicsContext, levelOfDetail) {
  // Grab the list for the requested LOD
  levelOfDetail = goog.math.clamp(levelOfDetail,
      0, this.levelsOfDetail.length - 1);
  var dataSources = this.levelsOfDetail[levelOfDetail];

  // TODO(benvanik): change heuristics - may want to prefer compressed vs.
  //     non-compressed, one compression format vs. another, etc

  // Data sources are sorted by size, so try each until we find one that works
  for (var n = 0; n < dataSources.length; n++) {
    var dataSource = dataSources[n];

    // TODO(benvanik): cache this?
    var imageFormat = this.getFormatFromDataSource(dataSource);
    if (!imageFormat) {
      continue;
    }

    // Verify WebP supported
    if (imageFormat.container == 'image/webp' &&
        !graphicsContext.features.supportsWebP) {
      continue;
    }

    // Verify S3TC supported
    switch (imageFormat.webglFormat) {
      case goog.webgl.COMPRESSED_RGB_S3TC_DXT1_EXT:
      case goog.webgl.COMPRESSED_RGBA_S3TC_DXT1_EXT:
      case goog.webgl.COMPRESSED_RGBA_S3TC_DXT3_EXT:
      case goog.webgl.COMPRESSED_RGBA_S3TC_DXT5_EXT:
        if (!graphicsContext.features.supportsS3TC) {
          continue;
        }
        break;
    }

    // Usable! Since sorted by size, we can exit early
    return dataSource;
  }

  // No usable formats found
  return null;
};


/**
 * Determines the WebGL format from the given data source.
 * @param {!gf.assets.DataSource} dataSource Image data source.
 * @return {gf.graphics.ImageFormat} An image format blob describing how to
 *     use the texture in WebGL.
 */
gf.graphics.ImageInfo.prototype.getFormatFromDataSource = function(dataSource) {
  // Formats are expected to be MIME-type compatible extended definitions
  // If no extended information is present then the type is assumed based on
  // the number of channels in the image
  //
  // Expected types look like:
  // image/nnn; codec=mmm, format=iii
  // Where the leading segment is the container format, and optionally the
  // following key-value pairs are recognized:
  // 'codec': a string value indicating the imaging codec used for compression
  //     If omitted, the codec is the default for the container.
  //     Example: s3tc.dxt1
  // 'format': a string value indicating the format the decoded bitmap should
  //     be interpreted as.
  //     If omitted, the format is guessed based on the container/codec/number
  //     of channels.
  //     Example: rgb, rgba, rgbp, a
  //
  // Common types:
  //     image/jpeg, 3 channels
  //     image/png, 3 or 4 channels
  //     image/webp, 3 channels
  //     application/octet-stream; codec=s3tc.dxt1, format=rgb
  //     application/octet-stream; codec=s3tc.dxt5, format=rgba

  // Note that although it's possible to build a regex for this, it's ugly
  var mimeType = goog.string.trim(dataSource.type);
  var container;
  var properties;
  var semicolon = mimeType.indexOf(';');
  if (semicolon != -1) {
    container = mimeType.substr(0, semicolon);
    properties = goog.string.trim(mimeType.substr(semicolon + 1));
  } else {
    container = mimeType;
    properties = '';
  }

  // Default the format based on number of color channels
  var formatValue;
  switch (this.channels) {
    case gf.graphics.ImageInfo.Channels.A:
      formatValue = 'a';
      break;
    case gf.graphics.ImageInfo.Channels.RA:
      formatValue = 'ra';
      break;
    case gf.graphics.ImageInfo.Channels.RGB:
      formatValue = 'rgb';
      break;
    case gf.graphics.ImageInfo.Channels.RGBA:
      formatValue = 'rgba';
      break;
    default:
      goog.asserts.fail('Unsupported number of channels: ' + this.channels);
      return null;
  }

  var codecValue;
  switch (container) {
    case 'image/gif':
      codecValue = 'gif';
      break;
    case 'image/jpeg':
      codecValue = 'jpeg';
      break;
    case 'image/png':
      codecValue = 'png';
      break;
    case 'image/webp':
      codecValue = 'webp';
      break;
    case 'application/octet-stream':
      // Must be specified
      codecValue = null;
      break;
    default:
      goog.asserts.fail('Unsupported container format: ' + container);
      return null;
  }

  var propertySet = properties.split(',');
  for (var n = 0; n < propertySet.length; n++) {
    var tuple = propertySet[n].split('=');
    if (tuple.length < 2) {
      continue;
    }
    var key = goog.string.trim(tuple[0]).toLowerCase();
    var value = goog.string.trim(tuple[1]).toLowerCase();

    if (key == 'codec') {
      // value = s3tc.dxt1 | s3tc.dxt5
      codecValue = value;
    } else if (key == 'format') {
      // value = rgb | rgba | rgbp | a
      formatValue = value;
    }
  }
  if (!codecValue) {
    goog.asserts.fail('Unspecied codec value');
    return null;
  }

  // Pick the format
  var webglFormat = goog.webgl.RGBA;
  var requiredExtension = null;
  switch (codecValue) {
    case 's3tc.dxt1':
      requiredExtension =
          gf.graphics.ExtensionName.WEBGL_compressed_texture_s3tc;
      switch (formatValue) {
        case 'rgb':
          webglFormat = goog.webgl.COMPRESSED_RGB_S3TC_DXT1_EXT;
          break;
        case 'rgba':
          webglFormat = goog.webgl.COMPRESSED_RGBA_S3TC_DXT1_EXT;
          break;
        default:
          goog.asserts.fail('Unsupported format combination');
          return null;
      }
      break;
    case 's3tc.dxt3':
      requiredExtension =
          gf.graphics.ExtensionName.WEBGL_compressed_texture_s3tc;
      webglFormat = goog.webgl.COMPRESSED_RGBA_S3TC_DXT3_EXT;
      if (formatValue != 'rgba') {
        goog.asserts.fail('Unsupported format combination');
        return null;
      }
      break;
    case 's3tc.dxt5':
      requiredExtension =
          gf.graphics.ExtensionName.WEBGL_compressed_texture_s3tc;
      webglFormat = goog.webgl.COMPRESSED_RGBA_S3TC_DXT5_EXT;
      if (formatValue != 'rgba') {
        goog.asserts.fail('Unsupported format combination');
        return null;
      }
      break;
    default:
      switch (formatValue) {
        case 'a':
          webglFormat = goog.webgl.ALPHA;
          break;
        case 'ra':
          webglFormat = goog.webgl.LUMINANCE_ALPHA;
          break;
        case 'rgb':
          webglFormat = goog.webgl.RGB;
          break;
        case 'rgba':
          webglFormat = goog.webgl.RGBA;
          break;
        default:
          goog.asserts.fail('Unsupported format combination');
          return null;
      }
  }

  return new gf.graphics.ImageFormat(container, codecValue, formatValue,
      webglFormat, requiredExtension);
};


/**
 * Bitmask values for color channel presence.
 * These values do not indicate the range of the color channels or their order
 * in the storage format.
 * @enum {number}
 */
gf.graphics.ImageInfo.Channels = {
  /** Red color channel. */
  R: 0x0001,
  /** Green color channel. */
  G: 0x0002,
  /** Blue color channel. */
  B: 0x0004,
  /** Alpha color channel. */
  A: 0x0008,

  /** RA color channels, for luminance-alpha. */
  RA: 0x0009,
  /** RGB color channels. */
  RGB: 0x0007,
  /** RGBA color channels. */
  RGBA: 0x000F
};



/**
 * Image format information.
 * @constructor
 * @param {string} container Container MIME type.
 * @param {string} codec Codec property.
 * @param {string} format Format property.
 * @param {number} webglFormat WebGL format constant value.
 * @param {number?} requiredExtension Extension name constant, if required.
 */
gf.graphics.ImageFormat = function(container, codec, format, webglFormat,
    requiredExtension) {
  /**
   * Container MIME type.
   * Example: image/png
   * @type {string}
   */
  this.container = container;

  /**
   * Codec property.
   * Example: png, s3tc.dxt1
   * @type {string}
   */
  this.codec = codec;

  /**
   * Format property.
   * Example: rgb
   * @type {string}
   */
  this.format = format;

  /**
   * WebGL format constant value.
   * @type {number}
   */
  this.webglFormat = webglFormat;

  /**
   * Extension name constant, if an extension is required to upload the texture.
   * @type {number?}
   */
  this.requiredExtension = requiredExtension;
};


/**
 * Whether an image in this format should be loaded as raw data (via an XHR)
 * or if an Image can be used.
 * @return {boolean} True if the image should be loaded as raw data.
 */
gf.graphics.ImageFormat.prototype.shouldLoadAsRawData = function() {
  switch (this.webglFormat) {
    case goog.webgl.COMPRESSED_RGB_S3TC_DXT1_EXT:
    case goog.webgl.COMPRESSED_RGBA_S3TC_DXT1_EXT:
    case goog.webgl.COMPRESSED_RGBA_S3TC_DXT3_EXT:
    case goog.webgl.COMPRESSED_RGBA_S3TC_DXT5_EXT:
      return true;
    default:
      return false;
  }
};
