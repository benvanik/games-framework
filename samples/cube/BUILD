# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'

# 'cube' sample build file

include_rules(glob('../../anvil_rules/**/*_rules.py'))

GSS_COMPILER_JAR='../..:closure_stylesheets_jar'
JS_COMPILER_JAR='../..:closure_compiler_jar'
GLSL_COMPILER_JS='../..:glsl_compiler_js'


# ----------------------------------------------------------------------------------------------------------------------
# CSS
# ----------------------------------------------------------------------------------------------------------------------

CUBE_CSS_SRCS=[
    'common.gss',
    'cube.gss',
    ]

closure_gss_library(
    name='cube_css_debug_compiled',
    mode='DEBUG_COMPILED',
    srcs=CUBE_CSS_SRCS,
    compiler_jar=GSS_COMPILER_JAR)

closure_gss_library(
    name='cube_css_compiled',
    mode='COMPILED',
    srcs=CUBE_CSS_SRCS,
    compiler_jar=GSS_COMPILER_JAR)
file_set(
    name='cube_css_compiled_only',
    srcs=':cube_css_compiled',
    src_filter='*.css')


# ----------------------------------------------------------------------------------------------------------------------
# Static Content
# ----------------------------------------------------------------------------------------------------------------------

copy_files(
    name='cube_static_uncompiled',
    srcs=[
        'cube-uncompiled.html',
        ])

copy_files(
    name='cube_static_compiled',
    srcs=[
        'cube.html',
        ])


# ----------------------------------------------------------------------------------------------------------------------
# Textures
# ----------------------------------------------------------------------------------------------------------------------

texture_set(
    name='cube_textures',
    namespace='cube.assets.textures',
    srcs=glob('assets/textures/**/*.*'))
file_set(
    name='cube_texture_images',
    srcs=':cube_textures',
    src_filter='*.png|*.jpg|*.gif|*.webp')


# ----------------------------------------------------------------------------------------------------------------------
# GLSL
# ----------------------------------------------------------------------------------------------------------------------

file_set(
    name='all_glsl',
    srcs=glob('assets/glsl/**/*.glsl'))
file_set(
    name='all_glsllib',
    srcs=glob('assets/glsl/**/*.glsllib'))

compile_glsl(
    name='cube_glsl',
    srcs=[':all_glsl'],
    deps=[':all_glsllib'],
    compiler_js=GLSL_COMPILER_JS)
file_set(
    name='cube_glsl_json',
    srcs=[':cube_glsl'],
    src_filter='*.json')


# ----------------------------------------------------------------------------------------------------------------------
# JavaScript
# ----------------------------------------------------------------------------------------------------------------------

file_set(
    name='all_js',
    srcs=glob('src/**/*.js'))

closure_js_fixstyle(
    name='cube_js_fixstyle',
    namespaces=['goog', 'gf', 'cube',],
    srcs=[':all_js'])

closure_js_lint(
    name='cube_js_lint',
    namespaces=['goog', 'gf', 'cube',],
    srcs=[':cube_js_fixstyle'])

CUBE_JS_SRCS=[
    '../..:all_gf_js',
    ':cube_js_fixstyle',
    ':cube_css_compiled',
    ':cube_glsl',
    ':cube_textures',
    ]

closure_js_library(
    name='cube_js_uncompiled',
    mode='UNCOMPILED',
    entry_points='cube.start',
    srcs=CUBE_JS_SRCS,
    compiler_jar=JS_COMPILER_JAR)

closure_js_library(
    name='cube_js_compiled',
    mode='ADVANCED',
    entry_points='cube.start',
    srcs=CUBE_JS_SRCS,
    compiler_jar=JS_COMPILER_JAR)


# ----------------------------------------------------------------------------------------------------------------------
# Target rules
# ----------------------------------------------------------------------------------------------------------------------

file_set(
    name='lint',
    deps=[
        ':cube_js_lint'])

file_set(
    name='debug',
    srcs=[
        ':cube_static_uncompiled',
        ':cube_texture_images',
        ':cube_css_debug_compiled',
        ':cube_glsl_json',
        ':cube_js_uncompiled',
        ])

file_set(
    name='release',
    srcs=[
        ':cube_static_compiled',
        ':cube_texture_images',
        ':cube_css_compiled_only',
        ':cube_js_compiled',
        ],
    deps=[
        ':cube_js_lint',
        ])
