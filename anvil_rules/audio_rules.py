# Copyright 2012 Google Inc. All Rights Reserved.

"""Audio related rules for the build system.

Contains the following rules:
audio_soundbank
audio_tracklist
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import math
import os
import re
import sys

import anvil.async
from anvil.context import RuleContext
from anvil.rule import Rule, build_rule
from anvil.task import Task, ExecutableTask, MakoTemplateTask
import anvil.util
from anvil.util import ensure_forwardslashes


def _get_soundbank_template_paths():
  template_path = os.path.join(anvil.util.get_script_path(), 'templates')
  json_template = os.path.join(template_path, 'soundbank_json.mako')
  js_template = os.path.join(template_path, 'soundbank_js.mako')
  return (json_template, js_template)


def _get_tracklist_template_paths():
  template_path = os.path.join(anvil.util.get_script_path(), 'templates')
  json_template = os.path.join(template_path, 'tracklist_json.mako')
  js_template = os.path.join(template_path, 'tracklist_js.mako')
  return (json_template, js_template)


_MIME_EXTS = {
    'audio/wav': '.wav',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/ogg': '.ogg',
    }


class DataSource(object):
  pass

# TODO(benvanik): proper bank construction
class CueVariant(object):
  pass
class Cue(object):
  pass
class SoundBank(object):
  pass


# TODO(benvanik): proper tracklist construction
class DataSource(object):
  pass
class Track(object):
  pass
class TrackList(object):
  pass


class AudioRuleContext(RuleContext):
  """Base type for audio-related rule contexts.
  Provides methods for common audio utilities.
  """
  pass

  def _encode_audio_file(self, src_path, out_path, target_type):
    """Begins a task to encode an audio file to the specified format.

    Args:
      src_path: Source audio file path. Generally .wav.
      out_path: Output audio file path.
      target_type: Target MIME type.

    Returns:
      A deferred for the task or None if the given conversion cannot be
      completed.
    """
    if sys.platform.startswith('win'):
      return None
    if target_type == 'audio/mpeg':
      executable_name = 'lame'
      args = [
        '--quiet',
        src_path,
        out_path]
    elif target_type == 'audio/ogg':
      executable_name = 'oggenc'
      args = [
        '-Q',
        '-o', out_path,
        src_path]
    elif target_type == 'audio/mp4':
      # TODO(benvanik): support MP4 conversion somehow
      return None
    else:
      # Copy
      return None

    return self._run_task_async(ExecutableTask(
            self.build_env, executable_name, call_args=args))


@build_rule('audio_soundbank')
class AudioSoundbankRule(Rule):
  """Audio sound bank creation and conversion rule.
  Packs all given input audio files into a single file and generates metadata
  and code-behind files.
  The rule outputs a single converted audio file containing all of the inputs
  and both a JS and JSON representation of the resulting soundbank.

  Input is currently restricted to .wav files.

  Inputs:
    class_name: Fully-qualified class name, such as 'my.audio.SoundBank1'.
    srcs: All source audio files.
    formats: An optional list of target format MIME types to convert to.
        If none are provided than the output will be audio/wav only.

  Outputs:
    A .js, .json, and a bank audio file converted to many formats.
  """

  def __init__(self, name, class_name, formats=None, *args, **kwargs):
    """Initializes an audio sound bank rule.

    Args:
      name: Rule name.
      class_name: Fully-qualified class name, such as 'my.audio.SoundBank1'.
      srcs: All source audio files.
      formats: An optional list of target format MIME types to convert to.
          If none are provided than the output will be audio/wav only.
    """
    super(AudioSoundbankRule, self).__init__(name, *args, **kwargs)
    self.src_filter = '*.wav'
    self.class_name = class_name

    self.formats = []
    if formats:
      self.formats.extend(formats)

    (json_template, js_template) = _get_soundbank_template_paths()
    self._append_dependent_paths([
        json_template,
        js_template])

  class _Context(AudioRuleContext):
    def begin(self):
      super(AudioSoundbankRule._Context, self).begin()

      # TODO(benvanik): split into tasks
      # - for each input file:
      #   - convert to wav if needed
      #   - get info
      #   - append to bank file
      # - for each target format:
      #   - convert bank file
      # - gather all converted file info
      # - write templated files

      js_path = self._get_gen_path(suffix='.js')
      json_path = self._get_out_path(suffix='.json')
      wav_path = self._get_out_path(suffix='.wav')
      self._ensure_output_exists(os.path.dirname(js_path))
      self._ensure_output_exists(os.path.dirname(json_path))
      self._ensure_output_exists(os.path.dirname(wav_path))
      self._append_output_paths([js_path, json_path, wav_path])

      base_path = os.path.relpath(self._get_rule_path(),
                                  self.build_env.root_path)
      rel_json_path = anvil.util.strip_build_paths(
          os.path.relpath(json_path, self.build_env.root_path))

      sound_bank = SoundBank()
      sound_bank.class_name = self.rule.class_name
      sound_bank.friendly_name = \
          self.rule.class_name[self.rule.class_name.rfind('.') + 1:]
      sound_bank.base_path = ensure_forwardslashes(base_path)
      sound_bank.json_path = ensure_forwardslashes(rel_json_path)
      sound_bank.data_sources = []
      sound_bank.cues = []

      # TODO(benvanik): run over sources and convert to wav where required

      # Prepare conversion map
      # This will hold information about the conversions that will take place
      conversions = []

      def _callback_post_convert(results):
        # Add sources for all converted files
        for i, conversion in enumerate(conversions):
          if results[i][0]:
            (format, fmt_path) = conversion
            source = DataSource()
            source.type = format
            source.path = ensure_forwardslashes(os.path.basename(fmt_path))
            source.size = os.path.getsize(fmt_path)
            sound_bank.data_sources.append(source)
            self._append_output_paths([fmt_path])

        # Template the results
        ds = []
        (json_template, js_template) = _get_soundbank_template_paths()
        # Generate JSON
        ds.append(self._run_task_async(MakoTemplateTask(
            self.build_env, json_path, json_template, {
                'bank': sound_bank,
                })))
        # Generate JS
        ds.append(self._run_task_async(MakoTemplateTask(
            self.build_env, js_path, js_template, {
                'bank': sound_bank,
                })))
        self._chain(ds)

      def _callback_post_merge(cues):
        sound_bank.cues.extend(cues)

        # Setup default source (the wav)
        source = DataSource()
        source.type = 'audio/wav'
        source.path = ensure_forwardslashes(os.path.basename(wav_path))
        source.size = os.path.getsize(wav_path)
        sound_bank.data_sources.append(source)

        # Convert wav to self.formats
        dc = []
        for i, format in enumerate(self.rule.formats):
          fmt_path = os.path.splitext(wav_path)[0] + _MIME_EXTS[format]
          d = self._encode_audio_file(wav_path, fmt_path, format)
          if d:
            conversions.append((format, fmt_path))
            dc.append(d)
        if len(dc):
          d = anvil.async.gather_deferreds(dc)
          d.add_callback_fn(_callback_post_convert)
          self._chain_errback(d)
        else:
          _callback_post_convert([])

      # Merge all wav files into one, return the list of cues for further
      # processing in the callback
      if len(self.src_paths):
        d = self._run_task_async(_MergeWavesTask(
            self.build_env, self.src_paths, wav_path))
        d.add_callback_fn(_callback_post_merge)
        self._chain_errback(d)
      else:
        _callback([])


class _MergeWavesTask(Task):
  """A task that merges many wave files into a single wav.
  """

  def __init__(self, build_env, src_paths, output_path,
      *args, **kwargs):
    """Initializes a wav merging task.

    Args:
      build_env: The build environment for state.
      src_paths: Source wave paths.
      output_path: Output wave path.
    """
    super(_MergeWavesTask, self).__init__(build_env, *args, **kwargs)
    self.src_paths = list(src_paths)
    self.output_path = output_path

  def execute(self):
    import wave

    # Create the output wave
    # The options are set based on the first wave file we add
    out_wav = wave.open(self.output_path, 'wb')
    has_set_target = False
    target_duration = 0

    try:
      # Silence frames - created when we have args and know the format
      silence_duration = 100 # ms
      silence_frames = None

      # Find all source wavs and build cues
      # This handles variant notation (-#.wav)
      cues = {}
      for src_path in self.src_paths:
        # Get the cue name - this removes any variant identifier at the end
        (cue_name, ext) = os.path.splitext(os.path.basename(src_path))
        cue_name_match = re.search('([a-zA-Z0-9_]+)(\-[0-9]+)?', cue_name)
        cue_name = cue_name_match.group(1)

        # Create the cue (or find an existing, if we are adding a variant)
        cue = cues.get(cue_name, None)
        if not cue:
          cue = Cue()
          cue.name = cue_name
          cue.playlist_mode = 'gf.audio.PlaylistMode.RANDOM'
          cue.playlist = []
          cues[cue_name] = cue

        # Open the source wave
        src_wav = wave.open(src_path, 'rb')

        # TODO(benvanik): recalc from current position instead of accumulating?
        #                 it's possible to drift a bit here
        cue_start = target_duration
        # TODO(benvanik): ensure correct - rounding up so that we don't drop
        #     frames
        cue_duration = long(math.ceil(
            (src_wav.getnframes() * 1000) / src_wav.getframerate()))

        # Set target properties, if required
        if not has_set_target:
          has_set_target = True
          out_wav.setnchannels(src_wav.getnchannels())
          out_wav.setsampwidth(src_wav.getsampwidth())
          out_wav.setframerate(src_wav.getframerate())
          silence_frame_count = silence_duration * src_wav.getframerate() / 1000
          silence_frame_size = src_wav.getnchannels() * src_wav.getsampwidth()
          silence_frames = bytearray()
          for n in range(0, silence_frame_count * silence_frame_size):
            silence_frames.append(0)
        else:
          # Ensure this wav matches our target
          if (src_wav.getnchannels() != out_wav.getnchannels() or
              src_wav.getsampwidth() != out_wav.getsampwidth() or
              src_wav.getframerate() != out_wav.getframerate()):
            raise Exception(
                'Source wave %s does not match target wave options' % (src_path))

        # Write the wav in
        source_frames = src_wav.readframes(src_wav.getnframes())
        out_wav.writeframes(source_frames)
        target_duration += cue_duration

        # Add padding
        out_wav.writeframes(silence_frames)
        target_duration += silence_duration

        # Add variant
        cue_variant = CueVariant()
        cue_variant.start = cue_start
        cue_variant.duration = cue_duration
        cue.playlist.append(cue_variant)

        src_wav.close()
    except Exception as e:
      print e
      return []
    finally:
      # Clean up output wave
      out_wav.close()

    return cues.values()


@build_rule('audio_tracklist')
class AudioTrackListRule(Rule):
  """Audio track conversion and organization rule.
  Converts the input audio tracks to various formats and generates metadata and
  code-behind files for them.
  This rule outputs converted audio files and both a JS and JSON representation
  of the track list.

  Inputs:
    class_name: Fully-qualified class name, such as 'my.audio.TrackList1'.
    srcs: All source audio files.
    formats: An optional list of target format MIME types to convert to.
        If none are provided than the source will be used.

  Outputs:
    A .js, .json, and any number of audio files for each input file.
  """

  def __init__(self, name, class_name, formats=None, *args, **kwargs):
    """Initializes an audio track list rule.

    Args:
      name: Rule name.
      class_name: Fully-qualified class name, such as 'my.audio.TrackList1'.
      srcs: All source audio files.
      formats: An optional list of target format MIME types to convert to.
          If none are provided than the source will be used.
    """
    super(AudioTrackListRule, self).__init__(name, *args, **kwargs)
    self.class_name = class_name

    self.formats = []
    if formats:
      self.formats.extend(formats)

    (json_template, js_template) = _get_tracklist_template_paths()
    self._append_dependent_paths([
        json_template,
        js_template])

  class _Context(AudioRuleContext):
    def begin(self):
      super(AudioTrackListRule._Context, self).begin()

      # TODO(benvanik): split into tasks
      # - for each input track:
      #   - for each target format:
      #     - convert audio file
      # - gather all converted file info
      # - write templated files

      js_path = self._get_gen_path(suffix='.js')
      json_path = self._get_out_path(suffix='.json')
      self._ensure_output_exists(os.path.dirname(js_path))
      self._ensure_output_exists(os.path.dirname(json_path))
      self._append_output_paths([js_path, json_path])

      base_path = os.path.relpath(self._get_rule_path(),
                                  self.build_env.root_path)
      rel_json_path = anvil.util.strip_build_paths(
          os.path.relpath(json_path, self.build_env.root_path))

      track_list = TrackList()
      track_list.class_name = self.rule.class_name
      track_list.friendly_name = \
          self.rule.class_name[self.rule.class_name.rfind('.') + 1:]
      track_list.base_path = ensure_forwardslashes(base_path)
      track_list.json_path = ensure_forwardslashes(rel_json_path)
      track_list.tracks = []

      # TODO(benvanik): convert/etc to self.formats
      for src_path in self.src_paths:
        self._append_output_paths([src_path])
        track = Track()
        track.name = os.path.splitext(os.path.basename(src_path))[0]
        track.duration = self._get_duration(src_path)
        track.data_sources = []
        # TODO(benvanik) proper mime type
        mime_type = {
            '.mp3': 'audio/mpeg',
            '.ogg': 'audio/ogg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            }[os.path.splitext(src_path)[1]]
        source = DataSource()
        source.type = mime_type
        source.path = ensure_forwardslashes(os.path.relpath(src_path,
                                                            base_path))
        source.size = os.path.getsize(src_path)
        track.data_sources.append(source)
        track_list.tracks.append(track)

      # Template the results
      ds = []
      (json_template, js_template) = _get_tracklist_template_paths()
      # Generate JSON
      ds.append(self._run_task_async(MakoTemplateTask(
          self.build_env, json_path, json_template, {
              'list': track_list,
              })))
      # Generate JS
      ds.append(self._run_task_async(MakoTemplateTask(
          self.build_env, js_path, js_template, {
              'list': track_list,
              })))
      self._chain(ds)

    def _get_duration(self, path):
      """Gets the duration, in ms, of the track at the given path.

      Args:
        path: Audio track path.

      Returns:
        Duration of the track, in ms. If the track cannot be parsed 0 is
        returned.
      """
      ext = os.path.splitext(path)[1]
      info = None
      if ext == '.mp3':
        import mutagen.mp3
        info = mutagen.mp3.Open(path).info
      elif ext == '.ogg':
        import mutagen.oggvorbis
        info = mutagen.oggvorbis.Open(path).info
      elif ext == '.m4a':
        import mutagen.m4a
        info = mutagen.m4a.Open(path).info
      elif ext == '.wav':
        import wave
        wav_file = wave.open(path, 'rb')
        duration = long(math.ceil(
            (wav_file.getnframes() * 1000) / wav_file.getframerate()))
        wav_file.close()
        return duration

      if info:
        return long(math.ceil(info.length * 1000))
      else:
        return 0
