goog.provide('${list.class_name}');

goog.require('gf');
goog.require('gf.assets.DataSource');
goog.require('gf.audio.JsonTrackList');
goog.require('gf.audio.Track');
goog.require('gf.audio.TrackList');



/**
 * @constructor
 * @extends {gf.audio.TrackList}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 */
${list.class_name} = function(assetManager, context) {
  var path = gf.BIN_PATH + '${list.base_path}';
  goog.base(
      this,
      assetManager,
      context,
      path,
      '${list.friendly_name}', [
      % for i, track in enumerate(list.tracks):
        new gf.audio.Track(context, path, '${track.name}', ${track.duration}, [
        % for j, source in enumerate(track.data_sources):
          new gf.assets.DataSource('${source.type}', '${source.path}', ${source.size})\
          % if j != len(track.data_sources) - 1:
,
          % endif
        % endfor
        % if i != len(list.tracks) - 1:
],
        % else:
])\
        % endif
      % endfor
]);
};
goog.inherits(${list.class_name}, gf.audio.TrackList);


/**
 * Creates an instance of the track list, switching to the JSON version
 * when running with a build daemon.
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 * @return {!gf.audio.TrackList} An instance of the track list.
 */
${list.class_name}.create = function(assetManager, context) {
  if (gf.BUILD_CLIENT && assetManager.runtime.buildClient) {
    return new gf.audio.JsonTrackList(
        assetManager.runtime,
        assetManager,
        context,
        gf.BIN_PATH + '${list.json_path}');
  } else {
    return new ${list.class_name}(assetManager, context);
  }
};
