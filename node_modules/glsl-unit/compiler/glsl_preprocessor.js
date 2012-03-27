// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Mode-Aware Preprocessor for GLSL Source code.  This
 * preprocessor allows a developer to specify a set of #defines that could
 * possibly be set at runtime (Modes).
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.compiler.GlslPreprocessor');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.Generator');
goog.require('glslunit.NodeCollector');
goog.require('glslunit.SpliceTransformer');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.NameGenerator');
goog.require('glslunit.compiler.ShaderMode');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.compiler.VariableMinifier');
goog.require('glslunit.glsl.parser');
goog.require('goog.array');



/**
 * Basic implementation of a glsl preprocessor.
 * @param {!Array.<string>} implicitModes Set of modes to define before
 *     preprocessing an AST.
 * @param {!Array.<string>} implicitDefines Set of definitions to define before
 *     preprocessing an AST.
 * @param {boolean} minifyJsConst Whether or not to minify JsConst values while
 *     preprocessing the shader program.
 * @param {boolean} minifyModeNames Whether or not to minify mode names values
 *     while preprocessing the shader program.
 * @constructor
 * @implements {glslunit.compiler.CompilerStep}
 */
glslunit.compiler.GlslPreprocessor = function(implicitModes, implicitDefines,
    minifyJsConst, minifyModeNames) {
  /**
   * Set of modes to define before preprocessing an AST.
   * @type {!Array.<string>}
   * @private
   */
  this.implicitModes_ = implicitModes;

  /**
   * Set of defines to define before preprocessing an AST.
   * @type {!Array.<string>}
   * @private
   */
  this.implicitDefines_ = implicitDefines;

  /**
   * Whether or not to minify JsConst names while preprocessing.
   * @type {boolean}
   * @private
   */
  this.minifyJsConst_ = minifyJsConst;

  /**
   * Whether or not to minify Mode names while preprocessing.
   * @type {boolean}
   * @private
   */
  this.minifyModeNames_ = minifyModeNames;
};



/**
 * Class which evaluates an "#if" or "#elif" in the context of the current
 * definitions
 * @param {!Object.<string,
 *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>} definitions
 *     The current set of definitions.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 */
glslunit.compiler.GlslPreprocessor.IfEvaluator = function(definitions) {
  goog.base(this);

  /**
   * Whether or not this ifStatement contained a mode.
   * @type {boolean}
   * @private
   */
  this.containsMode_ = false;

  /**
   * The set of definitions valid for this if branch.
   * @type {!Object.<string,
   *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>}
   * @private
   */
  this.definitions_ = definitions;

  /**
   * Whether or not the this is a valid statement to be evaluated by the
   * preprocessor
   * @type {boolean}
   * @private
   */
  this.isValid_ = true;
};
goog.inherits(glslunit.compiler.GlslPreprocessor.IfEvaluator,
              glslunit.ASTTransformer);


/**
 * Transforms all function calls to 'defined' by evaluating whether or not that
 *     symbol is defined in our current set of definitions.  If the symbol
 *     refers to a mode, note that this if statement contains a reference to a
 *     mode and continue on.
 * @param {!Object} node The function call node being transformed.
 * @return {!Object} The transformed node.
 */
glslunit.compiler.GlslPreprocessor.IfEvaluator.prototype.transformFunctionCall =
    function(node) {
  if (node.function_name == 'defined' &&
      node.parameters.length == 1 &&
      node.parameters[0].type == 'identifier') {
    var definition = this.definitions_[node.parameters[0].name];
    var isDefined;
    if (goog.isDef(definition)) {
      if (definition.mode) {
        this.containsMode_ = true;
        return node; // If
      } else {
        isDefined = 1;
      }
    } else {
      isDefined = 0;
    }
    return {
      id: glslunit.ASTTransformer.getNextId(),
      type: 'int',
      value: isDefined
    };
  } else {
    this.isValid_ = false;
    return node;
  }
};


/**
 * After transforming all of the nodes in the condition, check to see that only
 * valid nodes are contained in the condition.  The only acceptable nodes are
 * integers, binary nodes, unary nodes, and function calls to 'defined'.
 * Identifiers are only allowed as a parameter to 'defined'.
 * @param {!Object} node The transformed node.
 */
glslunit.compiler.GlslPreprocessor.IfEvaluator.prototype.checkIfValid =
    function(node) {
  if (this.isValid_) {
    var invalidNodes = glslunit.NodeCollector.collectNodes(node,
        goog.bind(function(x, stack) {
      // We've already checked all function calls are valid during the initial
      // transformation inside of transformFunctionCall.
      if (x.type == 'function_call' || x.type == 'operator' ||
          x.type == 'int' || x.type == 'binary' || x.type == 'unary') {
        return false;
      } else if (x.type == 'identifier') {
        // Identifiers are only allowed under calls to 'defined' or if they
        // refer to Modes
        var definition = this.definitions_[x.name];
        var isMode = goog.isDef(definition) && definition.mode;
        if (isMode) {
          this.containsMode_ = true;
        }
        return !(isMode ||
                 (stack.length > 0 &&
                  stack.slice(-1)[0].type == 'function_call'));
      }
      return true;
    }, this));
    this.isValid_ = (invalidNodes.length == 0);
  }
};


/**
 * Evaluates the condition of a preprocessor branch.
 * @param {string} conditionText The text of the condition to be evaluated.
 * @param {!Object.<string,
 *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>} definitions
 *     The current set of definitions.
 * @return {{isValid: boolean, containsMode: boolean,
 *           value: number, evaluatedText: string}} The result of evaluating
 *           the condition.
 */
glslunit.compiler.GlslPreprocessor.IfEvaluator.evaluateIf =
    function(conditionText, definitions) {
  // First, transform the if statement to replace any defined statements.
  var conditionNode = glslunit.glsl.parser.parse(conditionText, 'condition');
  var transformer =
      new glslunit.compiler.GlslPreprocessor.IfEvaluator(definitions);
  var evaluatedNode = transformer.transformNode(conditionNode);
  var evaluatedText = '';
  if (transformer.isValid_) {
    // If the statement was valid, serialize the if statement to a string, and
    // process all of the tokens in that string.  Then, check to ensure
    // the final result is still a valid if statement.
    evaluatedText = glslunit.compiler.GlslPreprocessor.processLine_(
        glslunit.Generator.getSourceCode(evaluatedNode), definitions);
    evaluatedNode = glslunit.glsl.parser.parse(evaluatedText, 'condition');
    transformer.checkIfValid(evaluatedNode);
  }
  var result = {
    isValid: transformer.isValid_,
    containsMode: transformer.containsMode_,
    value: 0,
    evaluatedText: evaluatedText
  };
  if (transformer.isValid_ && !transformer.containsMode_) {
    // If the if statement is valid AND doesn't contain a mode we can safely
    // use eval to get the final result of the statement.
    try {
      result.value = Number(
          eval(glslunit.Generator.getSourceCode(evaluatedNode)));
    } catch (exception) {
      result.isValid = false;
    }
  }
  return result;
};


/**
 * Regular expression for token splits in GLSL.
 * @type {RegExp}
 * @private
 * @const
 */
glslunit.compiler.GlslPreprocessor.RE_TOKEN_SEPERATOR_ =
    /([\.=;,\(\)\[\]{}\+\-:?!\|&<>\/\*]|[ \t\n]+)/g;


/**
 * Regular expression for a definition name.
 * @type {RegExp}
 * @private
 * @const
 */
glslunit.compiler.GlslPreprocessor.RE_DEFINE_IDENTIFIER_ =
    /[A-Za-z_][A-Za-z_0-9]*/g;



/**
 * Struct containing information about a preprocesor definition.
 * @param {!Object} node The AST node for the preprocessor definition.
 * @param {glslunit.compiler.ShaderMode=} mode An optional reference to this
 *     definition's mode if this definition is a mode.
 * @constructor
 */
glslunit.compiler.GlslPreprocessor.PreprocessorDefinition =
    function(node, mode) {
  /**
   * The name of the preprocessor definition.
   * @type {string}
   */
  this.name = node.identifier;

  /**
   * List of argument tokens for this definition if it's a macro function.
   * @type {Array.<string>}
   */
  this.arguments = node.parameters ?
    node.parameters.map(function(x) {return x.name;}) : null;

  /**
   * List of tokens for the preprocessor
   * @type {!Array.<string>}
   */
  this.tokens = node.token_string.split(
      glslunit.compiler.GlslPreprocessor.RE_TOKEN_SEPERATOR_).
      filter(function(x) {return x.length > 0;});

  /**
   * Whether or not this preprocessor definition comes from a mode.
   * @type {glslunit.compiler.ShaderMode}
   */
  this.mode = mode || null;
};


/**
 * Processes a token replacing all Object Macros.
 * @param {string} token The token being processed.
 * @param {!Object.<string,
 *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>} definitions
 *     The current set of definitions.
 * @param {!Object.<string, boolean>} expansionSet The set of macros already
 *     expanded when expanding this token.
 * @return {string} The string replacing token after expanding all object
 *     macros.
 * @private
 */
glslunit.compiler.GlslPreprocessor.processToken_ =
    function(token, definitions, expansionSet) {
  // Break in the event of a preprocessor loop
  if (token in expansionSet) {
    return token;
  }
  var definition = definitions[token];
  var result = token;
  if (goog.isDef(definition)) {
    if (!definition.mode) {
      // Macros are processed separate from tokens, so ignore all definitions
      // with arguments.
      if (!definition.arguments) {
        var newExpansion = goog.object.clone(expansionSet);
        newExpansion[token] = true;
        var processedTokens = definition.tokens.map(function(x) {
          var newToken =
              glslunit.compiler.GlslPreprocessor.processToken_(
                  x, definitions, newExpansion);
          return newToken;
        });
        result = processedTokens.join('');
      }
    } else {
      // If this is a mode, return it's short name if it has one, otherwise keep
      // the original value.
      result = definition.mode.shortName || definition.name;
    }
  }
  return result;
};


/**
 * Processes all of the function macros in a given list of tokens.
 * @param {!Array.<string>} tokens The list of tokens being processed.
 * @param {!Object.<string,
 *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>} definitions
 *     The current set of definitions.
 * @param {Object.<string, string>} macroArgs The value of macro arguments to
 *     use when expanding local tokens.  This is only set in the case where
 *     we have nested Macro calls.  E.g.
 *       #define FOO(A) A(X)
 *       #define BAR(Z) FOO(Z)
 *       BAR(HelloWorld)
 *     When expanding BAR, macroArgs would be {Z: "HelloWorld"}.
 * @param {!Object.<string, boolean>} expansionSet The set of macros already
 *     expanded when expanding this token.
 * @return {string} The line with all function macros expanded.
 * @private
 */
glslunit.compiler.GlslPreprocessor.processMacros_ =
    function(tokens, definitions, macroArgs, expansionSet) {
  for (var index in tokens) {
    var token = tokens[index];
    var definition = definitions[token];
    if (goog.isDef(definition) && definition.arguments) {
      // If this token looks like the start of a call to a macro function,
      // try to parse it as such.
      var restOfLine = tokens.slice(index).join('');
      var node = glslunit.glsl.parser.parse(restOfLine,
                                            'macro_call_line');
      if (node.macro_call &&
          node.macro_call.parameters.length == definition.arguments.length &&
          !(node.macro_call.macro_name.name in expansionSet)) {
        // If we succeeded in parsing out a macro call that matches the
        // prototype of the funciton macro, expand it.
        var macroCallNode = node.macro_call;

        // Add this macro to the expansion set
        var newExpansion = goog.object.clone(expansionSet);
        newExpansion[node.macro_call.macro_name.name] = true;

        // First, the contents of all macro parameters must be fully expanded.
        var inputParameters = macroCallNode.parameters.map(function(x) {
          var processedArg = glslunit.compiler.GlslPreprocessor.processLine_(
              glslunit.Generator.getSourceCode(x), definitions,
              macroArgs, newExpansion);
          return processedArg;
        });

        // Add the arguments to the definition map.
        var childArguments = {};
        for (var i in definition.arguments) {
          childArguments[definition.arguments[i]] = inputParameters[i];
        }

        var expandedMacro = glslunit.compiler.GlslPreprocessor.processLine_(
            definition.tokens.join(''), definitions,
            childArguments, newExpansion);
        var restOfLine = glslunit.compiler.GlslPreprocessor.processLine_(
            node.rest_of_line, definitions, macroArgs, expansionSet);
        // Re-exand the full line after processing all macros.
        return glslunit.compiler.GlslPreprocessor.processLine_(
            tokens.slice(0, index).join('') + expandedMacro + restOfLine,
            definitions, macroArgs, expansionSet);
      }
    }
  }
  return tokens.join('');
};


/**
 * Helper function to split a line along its tokens, process all of the tokens
 * in that line, searches for and processes any macros, and returns the newly
 * processed string.
 * @param {string} line The source line being processed.
 * @param {!Object.<string,
 *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>} definitions
 *     The current preprocessor definitions.
 * @param {Object.<string, string>=} macroArgs The value of macro arguments to
 *     use when expanding local tokens.  This is only set in the case where
 *     we have nested Macro calls.  E.g.
 *       #define FOO(A) A(X)
 *       #define BAR(Z) FOO(Z)
 *       BAR(HelloWorld)
 *     When expanding BAR, macroArgs would be {Z: "HelloWorld"}.
 * @param {!Object.<string, boolean>=} expansionSet The set of macros already
 *     expanded while expanding a parent call.
 * @return {string} The processed line.
 * @private
 */
glslunit.compiler.GlslPreprocessor.processLine_ =
    function(line, definitions, macroArgs, expansionSet) {
  macroArgs = macroArgs || {};
  expansionSet = expansionSet || {};
  var argsAndDefinitions = goog.object.clone(definitions);
  for (var i in macroArgs) {
    argsAndDefinitions[i] =
        new glslunit.compiler.GlslPreprocessor.PreprocessorDefinition(
            glslunit.glsl.parser.parse('#define ' + i + ' ' + macroArgs[i],
                                       'preprocessor_define'));
  }
  // First, process all Object Macros.
  var processedTokens = line.split(
    glslunit.compiler.GlslPreprocessor.RE_TOKEN_SEPERATOR_).
    filter(function(x) {return x.length > 0;}).
    map(function(x) {
      return glslunit.compiler.GlslPreprocessor.processToken_(
          x, argsAndDefinitions, {});
    });
  // Next, look for and expand any function macros.
  return glslunit.compiler.GlslPreprocessor.processMacros_(
      processedTokens, definitions, macroArgs, expansionSet);
};

/**
 * Enum for the status of a branch.
 * @enum {number}
 */
glslunit.compiler.GlslPreprocessor.BRANCH_STATUS = {
  NOT_TAKEN: 0,
  TAKEN: 1,
  MODE: 2
};


/**
 * Entry into a stack tracking preprocessor branches.
 * @param {glslunit.compiler.GlslPreprocessor.BRANCH_STATUS} status The status
 *     of the BranchEntry.
 * @param {boolean} everTaken Whether or not any section of this branch was
 *     definitively taken.
 * @param {boolean} containsMode Whether or not any part of this branch refers
 *     to a mode.
 * @constructor
 */
glslunit.compiler.GlslPreprocessor.BranchEntry =
    function(status, everTaken, containsMode) {
  /**
   * The status of the current branch.
   * @type {glslunit.compiler.GlslPreprocessor.BRANCH_STATUS}
   */
  this.status = status;

  /**
   * Whether or not any section of this branch was definitively taken.
   * @type {boolean}
   */
  this.everTaken = everTaken;

  /**
   * Whether or not any part of this branch refers to a mode.
   * @type {boolean}
   */
  this.containsMode = containsMode;
};


/**
 * Parse an #if, #ifdef, or #ifndef statement
 * @param {string} line The line being processed.
 * @param {boolean} skipLine Whether or not the current line should be skipped.
 * @param {!Object.<string,
 *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>} definitions
 *     The current preprocessor definitions.
 * @param {!Array.<string>} resultSource The list of lines for the result source
 *     code.
 * @param {!Array.<!glslunit.compiler.GlslPreprocessor.BranchEntry>}
 *     branchStatusStack The stack of branch statuses.
 * @return {boolean} Whether or not this #if statement is based off a mode.
 * @private
 */
glslunit.compiler.GlslPreprocessor.parseIfStatement_ =
    function(line, skipLine, definitions, resultSource, branchStatusStack) {
  var node = glslunit.glsl.parser.parse(line, 'preprocessor_if');
  if (skipLine) {
    // If we're already not taking this branch, note this branch wasn't
    // taken either and continue parsing.
    branchStatusStack.push(
        new glslunit.compiler.GlslPreprocessor.BranchEntry(
            glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN,
            false, false));
    return false;
  }
  var isMode = false;
  var shouldDiscardBranch = false;
  if (node.directive == '#ifdef' || node.directive == '#ifndef') {
    var definitionToken =
        node.value.match(
            glslunit.compiler.GlslPreprocessor.RE_DEFINE_IDENTIFIER_)[0];
    if (!goog.isDef(definitionToken)) {
      throw 'Invalid ' + node.directive + ': ' + line;
    }
    var definition = definitions[definitionToken];
    if (goog.isDef(definition) && definition.mode) {
      isMode = true;
      var modeName = definition.mode.shortName || definition.name;
      line = node.directive + ' ' + modeName;
    } else {
      shouldDiscardBranch =
          goog.isDef(definition) == (node.directive == '#ifndef');
    }
  } else {
    var ifEvaluation =
        glslunit.compiler.GlslPreprocessor.IfEvaluator.evaluateIf(
            node.value, definitions);
    if (!ifEvaluation.isValid) {
      throw 'Invalid ' + node.directive + ': ' + line;
    }
    // Rewrite line to contain the partially evaluated #if statement.
    // This statement will have everything except references to modes resolved.
    line = '#if ' + ifEvaluation.evaluatedText;
    isMode = ifEvaluation.containsMode;
    shouldDiscardBranch = (ifEvaluation.value == 0);
  }
  // If we were already skipping lines, then we should continue to skip
  // lines no matter what.
  // If we aren't skipping lines AND this branch is based upon a mode,
  // then we should not skip any lines, no matter what.
  // If this branch isn't a mode AND we're not already skipping lines,
  // determine whether or not we should start skipping lines based upon
  // the contents of the #if* directive
  if (isMode) {
    branchStatusStack.push(
      new glslunit.compiler.GlslPreprocessor.BranchEntry(
          glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.MODE,
          false, true));
  } else {
    var newBranchStatus = shouldDiscardBranch ?
        glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN :
        glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.TAKEN;
    branchStatusStack.push(
        new glslunit.compiler.GlslPreprocessor.BranchEntry(
            newBranchStatus, !shouldDiscardBranch, false));
  }
  if (isMode) {
    resultSource.push(line);
  }
  return isMode;
};


/**
 * Parse an #else statement
 * @param {!glslunit.compiler.GlslPreprocessor.BranchEntry} localBranch
 *     The information on the current branch.
 * @param {!Array.<!glslunit.compiler.GlslPreprocessor.BranchEntry>}
 *     branchStatusStack The stack of branch statuses.
 * @return {boolean} Whether or not the source of the #else needs to be kept.
 * @private
 */
glslunit.compiler.GlslPreprocessor.parseElseStatement_ =
    function(localBranch, branchStatusStack) {
  var parentBranchStatus = branchStatusStack.slice(-2, -1)[0].status;
  // If the parent was skipping lines, no matter what we will continue to
  // skip lines.
  var keepLine = false;
  if (!(parentBranchStatus ==
            glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN)) {
    if (localBranch.containsMode && !localBranch.everTaken) {
      var branchStatus, everTaken, containsMode;
      // If the branch contains a mode, we have to keep the else branch IFF no
      // other branches were definitively kept.  This can occur if an above
      // #elif statement would always evaluate to true.
      keepLine = true;
      branchStatus = glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.TAKEN;
      everTaken = localBranch.everTaken;
      containsMode = true;
    } else if (localBranch.status ==
        glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN &&
        !localBranch.everTaken) {
      // Otherwise, if this branch never had a mode AND we've never taken
      // any of the other sections of this if/elif/else statement, take
      // the else statement.
      branchStatus = glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.TAKEN;
      everTaken = true;
      containsMode = false;
    } else {
      // If one of the other sections of this branch has definitively been
      // taken, we would never use the #else statement so remove it.
      branchStatus = glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN;
      everTaken = true;
      containsMode = localBranch.containsMode;
    }
    branchStatusStack[branchStatusStack.length - 1] =
        new glslunit.compiler.GlslPreprocessor.BranchEntry(
            branchStatus, everTaken, containsMode);
  }
  return keepLine;
};


/**
 * Parse an #elif statement
 * @param {string} line The line being processed.
 * @param {!glslunit.compiler.GlslPreprocessor.BranchEntry} localBranch
 *     The information on the current branch.
 * @param {!Object.<string,
 *     glslunit.compiler.GlslPreprocessor.PreprocessorDefinition>} definitions
 *     The current preprocessor definitions.
 * @param {!Array.<string>} resultSource The list of lines for the result source
 *     code.
 * @param {!Array.<!glslunit.compiler.GlslPreprocessor.BranchEntry>}
 *     branchStatusStack The stack of branch statuses.
 * @return {boolean} Whether or not this #elif statement is based off a mode.
 * @private
 */
glslunit.compiler.GlslPreprocessor.parseElifStatement_ =
    function(line, localBranch, definitions, resultSource, branchStatusStack) {
  var parentBranchStatus = branchStatusStack.slice(-2, -1)[0].status;
  var isMode = false;
  // If the parent was skipping lines, no matter what we will continue to
  // skip lines.
  if (!(parentBranchStatus ==
            glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN)) {
    var node = glslunit.glsl.parser.parse(line, 'preprocessor_else_if');

    // Evaluate the If statement.
    var ifEvaluation =
      glslunit.compiler.GlslPreprocessor.IfEvaluator.evaluateIf(
          node.value, definitions);
    if (!ifEvaluation.isValid) {
      throw 'Invalid ' + node.directive + ': ' + line;
    }
    line = '#elif ' + ifEvaluation.evaluatedText;
    var shouldDiscardIf = (ifEvaluation.value == 0);

    var branchStatus, everTaken, containsMode;
    if (localBranch.containsMode && !localBranch.everTaken) {
      containsMode = true;
      if (ifEvaluation.containsMode) {
        branchStatus =
            glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.MODE;
        everTaken = false;
      } else if (!shouldDiscardIf) {
        // If this is an #elif statement off on #if statement based on a
        // mode AND we would always take the #elif branch, then convert
        // the #elif to an #else statement and ignore the rest of the
        // #elif/#else chain.
        line = '#else';
        branchStatus =
            glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.TAKEN;
        everTaken = true;
      } else {
        // This #elif statement would never be taken, so discard it.
        branchStatus =
          glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN;
        everTaken = false;
      }
    } else if (!localBranch.everTaken) {
      // Lines were already being discarded.
      if (ifEvaluation.containsMode) {
        // If lines were already being discarded AND the elif contains a
        // MODE, treat the elif as if it were a #if.
        line = line.replace(/^#elif/, '#if');
        branchStatus =
          glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.MODE;
        everTaken = false;
        containsMode = true;
        isMode = true;
      } else {
        branchStatus =
          shouldDiscardIf ?
              glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN :
              glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.TAKEN;
        everTaken = !shouldDiscardIf;
        containsMode = localBranch.containsMode;
      }
    } else {
      branchStatus =
          glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN;
      everTaken = localBranch.everTaken;
      containsMode = localBranch.containsMode;
    }
    branchStatusStack[branchStatusStack.length - 1] =
        new glslunit.compiler.GlslPreprocessor.BranchEntry(
            branchStatus, everTaken, containsMode);
    if (containsMode &&
        branchStatus !=
            glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN) {
      resultSource.push(line);
    }
  }
  return isMode;
};


/**
 * Does a mode-aware preprocessor run over a GLSL AST.
 * @param {!Object} ast The AST for the shader being preprocessed.
 * @param {Array.<!glslunit.compiler.ShaderMode>} modes The list of shader modes
 *     for this program.
 * @param {string} parse_rule The grammar rule to use when parsing the resulting
 *     ast.
 * @return {!Object} The AST after running the preprocessor.
 */
glslunit.compiler.GlslPreprocessor.preprocessAst =
    function(ast, modes, parse_rule) {
  // Populate the initial list of definitions with the modes.
  var modeDefines = {};
  goog.array.forEach(modes, function(mode) {
    var node = glslunit.glsl.parser.parse('#define ' + mode.preprocessorName,
                                          'preprocessor_define');
    modeDefines[mode.preprocessorName] =
        new glslunit.compiler.GlslPreprocessor.PreprocessorDefinition(node,
                                                                      mode);
    if (mode.shortName) {
      node = glslunit.glsl.parser.parse('#define ' + mode.shortName,
                                        'preprocessor_define');
      modeDefines[mode.shortName] =
          new glslunit.compiler.GlslPreprocessor.PreprocessorDefinition(node,
                                                                        mode);
    }
  });
  var definitions = modeDefines;
  var strippedSource = glslunit.Generator.getSourceCode(ast);

  // Stack of whether or not the current line should be skipped or not.
  var branchStatusStack = [
    new glslunit.compiler.GlslPreprocessor.BranchEntry(
        glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.TAKEN, true, false)
  ];

  // The number of if statements based upon modes on the branchStatusStack.
  var modeIfLevel = 0;

  var resultSource = [];
  goog.array.forEach(strippedSource.split(/\n/g), function(line, index, array) {
    var localBranch = branchStatusStack.slice(-1)[0];
    var skipLine = localBranch.status ==
        glslunit.compiler.GlslPreprocessor.BRANCH_STATUS.NOT_TAKEN;
    if (line.search('#define') == 0 && !skipLine) {
      if (modeIfLevel > 0) {
        // Bail
        throw 'Definitions can not be changed inside of Modes: ' + line;
      }
      var node = glslunit.glsl.parser.parse(line, 'preprocessor_define');
      var definition =
          new glslunit.compiler.GlslPreprocessor.PreprocessorDefinition(node);
      definitions[definition.name] = definition;
    } else if (line.search('#undef') == 0 && !skipLine) {
      if (modeIfLevel > 0) {
        // Bail
        throw 'Definitions can not be changed inside of Modes: ' + line;
      }
      var node = glslunit.glsl.parser.parse(line, 'preprocessor_operator');
      delete definitions[node.value];
    } else if (line.search('#if') == 0) {
      var isMode = glslunit.compiler.GlslPreprocessor.parseIfStatement_(
        line, skipLine, definitions, resultSource, branchStatusStack);
      // Only increment modeIfLevel if this branch is based off a mode.
      modeIfLevel += isMode && !skipLine;
    } else if (line.search('#else') == 0) {
      var keepLine = glslunit.compiler.GlslPreprocessor.parseElseStatement_(
          localBranch, branchStatusStack);
      if (keepLine) {
        resultSource.push(line);
      }
    } else if (line.search('#elif') == 0) {
      var isMode = glslunit.compiler.GlslPreprocessor.parseElifStatement_(
          line, localBranch, definitions, resultSource, branchStatusStack);
      modeIfLevel += isMode;
    } else if (line.search('#endif') == 0) {
      branchStatusStack.pop();
      if (localBranch.containsMode) {
        modeIfLevel--;
        resultSource.push(line);
      }
    } else {
      // Normal line.
      if (!skipLine) {
        // Process each token in the line replacing any definitions.
        var processedLine =
            glslunit.compiler.GlslPreprocessor.processLine_(line, definitions);
        resultSource.push(processedLine);
      }
    }
  });
  return glslunit.glsl.parser.parse(resultSource.join('\n'), parse_rule);
};


/**
 * The name of this compilation step.
 * @type {string}
 * @const
 */
glslunit.compiler.GlslPreprocessor.NAME = 'Preprocessor';


/** @override */
glslunit.compiler.GlslPreprocessor.prototype.getName = function() {
  return glslunit.compiler.GlslPreprocessor.NAME;
};


/** @override */
glslunit.compiler.GlslPreprocessor.prototype.getDependencies =
    function() {
  // TODO(rowillia): This is required because we still want to generate minified
  // variable names for attributes and uniforms that ultimately get removed by
  // the preprocessor.  This no longer be required once a program has a concept
  // of a variant and we can still have the original list of input variables.
  return [glslunit.compiler.VariableMinifier.NAME];
};


/**
 * Prepends a set of definition nodes to an AST.
 * @param {!Object} ast The AST to prepend the definition nodes to.
 * @param {!Object} definitionNodes The root of an AST with the
 *     definition nodes to prepend.
 * @return {!Object} The root of the new AST with the prepended definition
 *     nodes.
 * @private
 */
glslunit.compiler.GlslPreprocessor.addDefines_ =
    function(ast, definitionNodes) {
  return glslunit.SpliceTransformer.splice(ast, ast,
      'statements', 0, 0, definitionNodes.statements);
};


/** @override */
glslunit.compiler.GlslPreprocessor.prototype.performStep =
    function(stepOutputMap, shaderProgram) {
  var newDefinitions = this.implicitDefines_;
  var nameGenerator = new glslunit.compiler.NameGenerator();
  if (this.minifyModeNames_) {
    for (var i in shaderProgram.shaderModes) {
      var newName = nameGenerator.getNextShortDefinition();
      shaderProgram.shaderModes[i].shortName = newName;
    }
  }
  if (this.minifyJsConst_) {
    for (var i in shaderProgram.jsConsts) {
      var newName = nameGenerator.getNextShortDefinition();
      newDefinitions.push(shaderProgram.jsConsts[i].value + ' ' + newName);
      shaderProgram.jsConsts[i].value = newName;
    }
  }
  var definedModes = this.implicitModes_.map(function(x) {
    var result = new glslunit.compiler.ShaderMode();
    result.preprocessorName = x;
    return result;
  }).concat(shaderProgram.shaderModes);
  var definitionNodes = glslunit.glsl.parser.parse(
    newDefinitions.map(function(x) {
      return '#define ' + x;
    }).join('\n'));
  shaderProgram.vertexAst = glslunit.compiler.GlslPreprocessor.preprocessAst(
      glslunit.compiler.GlslPreprocessor.addDefines_(shaderProgram.vertexAst,
                                                    definitionNodes),
      definedModes,
      'vertex_start');
  shaderProgram.fragmentAst = glslunit.compiler.GlslPreprocessor.preprocessAst(
      glslunit.compiler.GlslPreprocessor.addDefines_(shaderProgram.fragmentAst,
                                                    definitionNodes),
      definedModes,
      'fragment_start');
  return [];
};
