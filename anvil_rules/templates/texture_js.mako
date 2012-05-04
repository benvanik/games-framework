goog.provide('${image.class_name}');

goog.require('gf');
goog.require('gf.assets.DataSource');
goog.require('gf.graphics.ImageInfo');
goog.require('gf.graphics.JsonTexture');
goog.require('gf.graphics.LoadableTexture');



/**
 * Source: ${image.src_path}
 * @constructor
 * @extends {gf.graphics.LoadableTexture}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.graphics.GraphicsContext} context Graphics context.
 */
${image.class_name} = function(assetManager, context) {
  goog.base(
      this,
      assetManager,
      context,
      gf.BIN_PATH + '${image.base_path}',
      '${image.friendly_name}',
      new gf.graphics.ImageInfo(${image.width}, ${image.height}, ${image.channels}, [
      % for i, lod in enumerate(image.lod_list):
        [
        % for j, source in enumerate(lod):
          new gf.assets.DataSource('${source.type}', '${source.path}', ${source.size})
          % if j != len(lod) - 1:
,
          % endif
        % endfor
        % if i != len(image.lod_list) - 1:
        ],
        % else:
        ]
        % endif
      % endfor
      ]));
};
goog.inherits(${image.class_name}, gf.graphics.LoadableTexture);


/**
 * Creates an instance of the texture, switching to the JSON version
 * when running with a build daemon.
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {!gf.graphics.GraphicsContext} context Graphics context.
 * @return {!gf.graphics.Texture} An instance of the texture.
 */
${image.class_name}.create = function(assetManager, context) {
  if (gf.BUILD_CLIENT && assetManager.runtime.buildClient) {
    return new gf.graphics.JsonTexture(
        assetManager,
        context,
        gf.BIN_PATH + '${image.json_path}',
        '${image.friendly_name}');
  } else {
    return new ${image.class_name}(assetManager, context);
  }
};
