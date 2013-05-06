# Copyright 2012 Google Inc. All Rights Reserved.

__author__ = 'benvanik@google.com (Ben Vanik)'

# Master build file for games-framework
# This should be referenced to include the various parts of GF from host apps

# ----------------------------------------------------------------------------------------------------------------------
# Custom Build Rules
# ----------------------------------------------------------------------------------------------------------------------
# GF-specific build rules
# If you want to use any of the rules, add the following to the top of your BUILD files:
# include_rules('path/to/games-framework:rules')
# TODO(benvanik): support rule references - for now, use this:
# include_rules(glob('path/to/games-framework/anvil_rules/**/*_rules.py'))

file_set(
    name='rules',
    srcs=glob('anvil_rules/**/*_rules.py'))
include_rules(glob('anvil_rules/**/*_rules.py'))

# ----------------------------------------------------------------------------------------------------------------------
# Third Party
# ----------------------------------------------------------------------------------------------------------------------

# Closure Library JS files
file_set(
    name='all_closure_js',
    srcs=
        glob('third_party/closure-library/closure/goog/**/*.js') +
        glob('third_party/closure-library/third_party/closure/goog/**/*.js') +
        ['third_party/closure-templates/soyutils_usegoog.js'])

# Files required when deploying uncompiled builds
file_set(
    name='all_uncompiled_js',
    srcs=[
        'third_party/closure-library/closure/goog/deps.js',
        'third_party/closure-library/closure/goog/bootstrap/webworkers.js',
        ])

# Closure externs files
file_set(
    name='closure_externs',
    srcs=glob('externs/**/*.js'))

# Closure Compiler JAR
file_set(
    name='closure_compiler_jar',
    srcs=['third_party/closure-compiler/compiler.jar'])

# Closure Stylesheets JAR
file_set(
    name='closure_stylesheets_jar',
    srcs=['third_party/closure-stylesheets/closure-stylesheets.jar'])

# Closure Templates JAR
file_set(
    name='closure_templates_jar',
    srcs=['third_party/closure-templates/SoyToJsSrcCompiler.jar'])

# GLSL compiler app js
file_set(
    name='glsl_compiler_js',
    srcs=['third_party/glsl-unit/bin/template_glsl_compiler.js'])

# ----------------------------------------------------------------------------------------------------------------------
# JavaScript
# ----------------------------------------------------------------------------------------------------------------------

compile_msg(
    name='gf_msg',
    srcs=glob('src/**/*.msg'))

compile_simstate(
    name='gf_simstate',
    srcs=glob('src/gf/sim/**/*.simstate'))

file_set(
    name='gf_js',
    srcs=[
        ':gf_msg',
        ':gf_simstate',
        ] + glob('src/**/*.js'))

# All GF JS files, including Closure Library
file_set(
    name='all_gf_js',
    srcs=[
        ':all_closure_js',
        'third_party/wtf-trace-closure.js',
        ':gf_js',
        ])
