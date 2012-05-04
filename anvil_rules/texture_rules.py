# Copyright 2012 Google Inc. All Rights Reserved.

"""Graphics texture rules for the build system.

Contains the following rules:
texture_set
"""

__author__ = 'benvanik@google.com (Ben Vanik)'


import os

import anvil.async
from anvil.context import RuleContext
from anvil.rule import Rule, build_rule
from anvil.task import Task, MakoTemplateTask
import anvil.util


# TODO(benvanik): clean up/move/etc channels
CHANNELS_A = 0x8
CHANNELS_RGB = 0x7
CHANNELS_RGBA = 0xF


def _get_template_paths():
  template_path = os.path.join(anvil.util.get_script_path(), 'templates')
  json_template = os.path.join(template_path, 'texture_json.mako')
  js_template = os.path.join(template_path, 'texture_js.mako')
  return (json_template, js_template)


@build_rule('texture_set')
class TextureSetRule(Rule):
  """Texture optimization/embedding rule.
  Will optimize input images based on mode settings.
  Each input image translates to exactly one .json file and .js file, plus
  the optimized images that results.
  The .json file supports runtime loading of the results, while the .js file
  implements the gf.graphics.Texture type to make working with the image
  easier.

  Inputs:
    namespace: Namespace to place code in, such as 'my.textures'.
    srcs: All source image files.

  Outputs:
    A .js, .json, and any number of images for each input image.
  """

  def __init__(self, name, namespace, *args, **kwargs):
    """Initializes a texture optimization rule.

    Args:
      namespace: Namespace to place code in, such as 'my.textures'.
      srcs: All source image files.
    """
    super(TextureSetRule, self).__init__(name, *args, **kwargs)
    self.namespace = namespace

    (json_template, js_template) = _get_template_paths()
    self._append_dependent_paths([
        json_template,
        js_template])

  class _Context(RuleContext):
    def begin(self):
      super(TextureSetRule._Context, self).begin()

      # Nasty, required to work around a bug in PIL when writing JPGs with
      # optimize and quality over 85
      import ImageFile
      ImageFile.MAXBLOCK = 2000000

      ds = []
      for src_path in self.src_paths:
        json_path = os.path.splitext(self._get_out_path_for_src(src_path))[0]
        json_path += '.json'
        js_path = os.path.splitext(self._get_gen_path_for_src(src_path))[0]
        js_path += '.js'
        self._ensure_output_exists(os.path.dirname(json_path))
        self._ensure_output_exists(os.path.dirname(js_path))
        self._append_output_paths([json_path, js_path])

        ds.extend(self._optimize_image(src_path, json_path, js_path))

      # Kick off optimizations
      dg = anvil.async.gather_deferreds(ds, errback_if_any_fail=True)
      self._chain(dg)

    def _optimize_image(self, src_path, json_path, js_path):
      """Begins tasks to identify, optimize, and write metadata for a single
      input image.

      Args:
        src_path: Source path to an image file.
        json_path: JSON file output path.
        js_path: JS file output path.

      Returns:
        A list of Deferreds for all image tasks.
      """
      ds = []

      rel_src_path = anvil.util.strip_build_paths(
          os.path.relpath(src_path, self.build_env.root_path))
      rel_json_path = anvil.util.strip_build_paths(
          os.path.relpath(json_path, self.build_env.root_path))

      # TODO(benvanik): want to split this into tasks:
      # - IdentifyImageTask: read metadata, decide what to do
      # - *ExecutionTask[]: various conversions (if required)
      # - Gather back, write metadata

      # TODO(benvanik): identify in a task
      (width, height, channels) = self._identify_image(src_path)

      # TODO(benvanik): encode? drop invalid name things? (whitespace/etc)
      class_name = os.path.splitext(os.path.basename(src_path))[0]

      # TODO(benvanik): proper image info construction
      class Image(object):
        pass
      image = Image()
      image.class_name = '%s.%s' % (self.rule.namespace, class_name)
      image.friendly_name = class_name
      image.src_path = rel_src_path
      image.base_path = os.path.dirname(rel_src_path)
      image.json_path = rel_json_path
      image.width = width
      image.height = height
      image.channels = channels

      # TODO(benvanik) proper mime type
      mime_type = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          }[os.path.splitext(src_path)[1]]
      class ImageLod(object):
        pass
      lod0 = ImageLod()
      lod0.type = mime_type
      lod0.path = os.path.basename(src_path)
      lod0.size = os.path.getsize(src_path)
      image.lod_list = [
          [lod0,],
          ]

      # TODO(benvanik): optimize, instead of just copying source
      self._append_output_paths([src_path])

      (json_template, js_template) = _get_template_paths()
      # Generate JSON
      ds.append(self._run_task_async(MakoTemplateTask(
          self.build_env, json_path, json_template, {
              'image': image,
              })))
      # Generate JS
      ds.append(self._run_task_async(MakoTemplateTask(
          self.build_env, js_path, js_template, {
              'image': image,
              })))
      return ds

    def _identify_image(self, src_path):
      """Identifies the dimensions/format/size of an image.

      Args:
        src_path: Image path.

      Returns:
        (width, height, channels), where channels is one of the CHANNELS_ enum
        values.
      """
      import Image
      ext = os.path.splitext(src_path)[1]
      if ext in ['.png', '.jpg']:
        img = Image.open(src_path)
        channels = CHANNELS_RGB
        if img.mode == 'RGB':
          channels = CHANNELS_RGB
        elif img.mode == 'RGBA' or img.mode == 'P':
          channels = CHANNELS_RGBA
        elif img.mode == 'L':
          channels = CHANNELS_RGBA
        else:
          raise Exception('Unknown mode: %s' % (img.mode))
        return (img.size[0], img.size[1], channels)
      raise Exception('Unknown extension: %s' % (ext))

