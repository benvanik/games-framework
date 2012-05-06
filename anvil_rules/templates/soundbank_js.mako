goog.provide('${bank.class_name}');

goog.require('gf');
goog.require('gf.audio.Cue');
goog.require('gf.assets.DataSource');
goog.require('gf.audio.JsonSoundBank');
goog.require('gf.audio.PlaylistMode');
goog.require('gf.audio.SoundBank');



/**
 * @constructor
 * @extends {gf.audio.SoundBank}
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 */
${bank.class_name} = function(assetManager, context) {
  goog.base(
      this,
      assetManager,
      context,
      gf.BIN_PATH + '${bank.base_path}',
      '${bank.friendly_name}', [
      % for i, source in enumerate(bank.data_sources):
        new gf.assets.DataSource('${source.type}', '${source.path}', ${source.size})\
        % if i != len(bank.data_sources) - 1:
,
        % endif
      % endfor
], [
      % for i, cue in enumerate(bank.cues):
        new gf.audio.Cue(
            '${cue.name}',
            ${cue.playlist_mode}, [
            % for j, variant in enumerate(cue.playlist):
              new gf.audio.Cue.Variant(${variant.start}, ${variant.duration})\
              % if j != len(cue.playlist) - 1:
,
              % endif
            % endfor
])\
            % if i != len(bank.cues) - 1:
,
            % endif
      % endfor
]);
};
goog.inherits(${bank.class_name}, gf.audio.SoundBank);


/**
 * Creates an instance of the sound bank, switching to the JSON version
 * when running with a build daemon.
 * @param {!gf.assets.AssetManager} assetManager Asset manager.
 * @param {AudioContext} context Audio context.
 * @return {!gf.audio.SoundBank} An instance of the sound bank.
 */
${bank.class_name}.create = function(assetManager, context) {
  if (gf.BUILD_CLIENT && assetManager.runtime.buildClient) {
    return new gf.audio.JsonSoundBank(
        assetManager.runtime,
        assetManager,
        context,
        gf.BIN_PATH + '${bank.json_path}');
  } else {
    return new ${bank.class_name}(assetManager, context);
  }
};
