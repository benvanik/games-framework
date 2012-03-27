// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Preprocesses .glsl and .glslib files for use in the compiler.
 *     Takes in the contents of a glsl file and all known library files.
 * @author rowillia@google.com (Roy Williams)
 * @suppress {missingProperties}
 */

goog.provide('glslunit.compiler.TemplateCompiler');

goog.require('Mustache');
goog.require('glslunit.compiler.BraceReducer');
goog.require('glslunit.compiler.Compiler');
goog.require('glslunit.compiler.ConstructorMinifier');
goog.require('glslunit.compiler.DeadFunctionRemover');
goog.require('glslunit.compiler.DeclarationConsolidation');
goog.require('glslunit.compiler.FunctionMinifier');
goog.require('glslunit.compiler.Preprocessor');
goog.require('glslunit.compiler.VariableMinifier');
goog.require('goog.node.FLAGS');
goog.require('goog.object');

var path = require('path');
var fs = require('fs');

goog.node.FLAGS.define_string('input', undefined, 'The input file in GLSL.');
goog.node.FLAGS.define_string('output', '', 'The output js file.');
goog.node.FLAGS.define_string('template', '',
                              'The output shader source code file.');
goog.node.FLAGS.define_string('glsl_include_prefix', '',
    'Compiler will try prefixing this flag to the path of glsllib files. If ' +
    'not found there use ones in current directory.');
goog.node.FLAGS.define_string_array('template_include_prefix', [],
    'Compiler will try prefixing this flag to the path of template files. If ' +
    'not found there use ones in current directory.');

goog.node.FLAGS.define_bool('remove_dead_functions', true,
    'Compiler will remove any functions it determines to be dead.');
goog.node.FLAGS.define_string('variable_renaming', 'ALL',
    'The level at which the compiler will minify variable names.  ALL will ' +
    'minify all variable names, including uniforms and attributes but can ' +
    'also output a map of old names to new names.  INTERNAL will only minify' +
    'variables that aren\'t exposed to JavaScript.  OFF won\'t minify any ' +
    'variables.');
goog.node.FLAGS.define_string('consolidate_declarations', 'ALL',
    'The level at which the compiler will consolidate declarations.  ALL ' +
    'will consolidate all declarations, including attributes (this can ' +
    'change the values returned by getAttribLocation).  INTERNAL will ' +
    'consolidate all variables with the exception of attributes.  OFF won\'t' +
    'consolidate any attributes.');
goog.node.FLAGS.define_bool('function_renaming', true,
    'Compiler will minify all function names.');
goog.node.FLAGS.define_bool('remove_braces', true,
    'Remove all braces that aren\'t required.');
goog.node.FLAGS.define_bool('minify_constructors', true,
    'Compiler will minify all constructor calls where it can by removing ' +
    'inputs and converting types to int where possible.  For example, ' +
    'vec4(1.0, 1.0, 1.0, 1.0) will become vec4(1).');

goog.node.FLAGS.define_bool('pretty_print', false,
    'Output pretty-printed GLSL source code.');

goog.node.FLAGS.define_string_array('template_property', [],
    'Properties to be passed down to template for rendering.');

goog.node.FLAGS.parseArgs();


/**
 * Set of valid GLSL extensions.
 * @type {Object.<string, boolean>}
 * @const
 */
var GLSL_EXTENSIONS = {
  '.glsl': true,
  '.glsllib': true
};


/**
 * Loads all of the files under inputDir and any subdirectories contained in
 * prefixes.
 * @param {string} inputDir The directory of the input file.
 * @param {Array.<string>} prefixes The prefixes of other directories to load
 *      files from.
 * @param {function(string):boolean=} filterFunction to filter files to load.
 * @return {!Object.<string, string>} Map of filenames to their contents.
 */
function loadFiles(inputDir, prefixes, filterFunction) {
  var directories = [inputDir];
  filterFunction = filterFunction || function(x) {return true;};
  if (prefixes) {
    prefixes.forEach(function(prefix) {
      directories.push(path.join(inputDir, prefix));
    });
  }
  var result = {};
  directories.forEach(function(dir) {
    var files = fs.readdirSync(dir).filter(function(fileOrDir) {
          return !fs.statSync(path.join(dir, fileOrDir)).isDirectory() &&
              filterFunction(fileOrDir);
        });
    files.forEach(function(fileName) {
      result[fileName] = fs.readFileSync(path.join(dir, fileName), 'utf8');
    });
  });
  return result;
}


function main() {
  var inputDir = path.dirname(goog.node.FLAGS.input);
  var shaderDirectories = [inputDir];
  var shaderFiles = loadFiles(inputDir, goog.node.FLAGS.glsl_include_prefix,
      function(x) {
    return path.extname(x) in GLSL_EXTENSIONS;
  });
  var templateFiles = loadFiles(inputDir,
                                goog.node.FLAGS.template_include_prefix);
  var start = new Date().getTime();
  try {
    var shaderProgram = glslunit.compiler.Preprocessor.ParseFile(
        path.basename(goog.node.FLAGS.input),
        shaderFiles);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  var originalProgram = /** @type {glslunit.compiler.ShaderProgram} */
      (goog.object.clone(shaderProgram));
  var finish = new Date().getTime();

  start = new Date().getTime();
  var compiler = new glslunit.compiler.Compiler(shaderProgram);

  var all_internal_map = {
    'ALL': true,
    'INTERNAL': false
  };

  if (goog.node.FLAGS.remove_dead_functions) {
    compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
        new glslunit.compiler.DeadFunctionRemover());
  }
  if (goog.node.FLAGS.remove_braces) {
    compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
        new glslunit.compiler.BraceReducer());
  }
  if (goog.node.FLAGS.variable_renaming in all_internal_map) {
    compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
        new glslunit.compiler.VariableMinifier(
            all_internal_map[goog.node.FLAGS.variable_renaming]));
  }
  if (goog.node.FLAGS.consolidate_declarations in all_internal_map) {
    compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
        new glslunit.compiler.DeclarationConsolidation(
            all_internal_map[goog.node.FLAGS.consolidate_declarations]));
  }
  if (goog.node.FLAGS.function_renaming) {
    compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
        new glslunit.compiler.FunctionMinifier());
  }
  if (goog.node.FLAGS.minify_constructors) {
    compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
        new glslunit.compiler.ConstructorMinifier());
  }
  shaderProgram = compiler.compileProgram();
  shaderProgram.prettyPrint = goog.node.FLAGS.pretty_print;

  finish = new Date().getTime();

  var templateProperties = {};
  goog.node.FLAGS.template_property.forEach(function(property) {
    var keyVal = property.split('=', 2);
    if (keyVal.length != 2) {
      console.error('Invalid template property: ' + property);
      process.exit(1);
    }
    templateProperties[keyVal[0]] = keyVal[1];
  });
  shaderProgram.templateProperties = templateProperties;

  var output = '';
  if (shaderProgram.template || goog.node.FLAGS.template) {
    var template_source = '';
    if (shaderProgram.template) {
      template_source = templateFiles[shaderProgram.template];
      if (!template_source) {
        console.error('Could not find template ' + shaderProgram.template);
        process.exit(1);
      }
    } else {
      template_source = fs.readFileSync(goog.node.FLAGS.template, 'utf8');
    }
    shaderProgram.defaultUniformsAndAttributes();
    output = Mustache.to_html(template_source, shaderProgram) + '\n';
    var template = false;
    var template_source = fs.readFileSync(goog.node.FLAGS.template, 'utf8');
    shaderProgram.defaultUniformsAndAttributes();
    output = Mustache.to_html(template_source, shaderProgram) + '\n';
  } else {
    output =
       '\n//! VERTEX\n' +
        glslunit.Generator.getSourceCode(shaderProgram.vertexAst,
                                         '\\n') +
        '\n//! FRAGMENT\n' +
        glslunit.Generator.getSourceCode(shaderProgram.fragmentAst,
                                         '\\n');
  }
  if (goog.node.FLAGS.output) {
    fs.writeFileSync(goog.node.FLAGS.output, output);
  } else {
    process.stdout.write(output);
  }
}

main();

