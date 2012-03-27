// Copyright 2011 Google Inc. All Rights Reserved.
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
 * @fileoverview GLSL AST Visitor that gathers all of the variables for a given
 * scope.  Consumers should use the getVariablesInScope static method.
 *
 * @author rowillia@google.com (Roy Williams)
 */

goog.provide('glslunit.VariableScopeVisitor');

goog.require('glslunit.ASTVisitor');
goog.require('goog.array');



/**
 * Creates a VariableScopeVisitor.  This class should never be newed up by a
 * consumer, instead they should use the getVariablesInScope static method.
 * @param {Object=} opt_targetScope The scope whose variables we're collecting.
 * @param {boolean=} opt_promotePreprocessorVars Whether or not variables
 *     declared inside of an preprocessor statement will be considered part of
 *     their parent's scope.  Defaults to false.
 * @extends {glslunit.ASTVisitor}
 * @constructor
 * @export
 */
glslunit.VariableScopeVisitor = function(opt_targetScope,
                                         opt_promotePreprocessorVars)  {
  goog.base(this);

  /**
   * The scope whose variables we're collecting.
   * @type {Object}
   * @private
   */
  this.targetScope_ = opt_targetScope || null;


  /**
   * Whether or not variables
   *     declared inside of an preprocessor statement will be considered part of
   *     their parent's scope.
   * @type {boolean}
   * @private
   */
  this.promoteIfdefVars_ = !!opt_promotePreprocessorVars;

  /**
   * Map of a variable's name to where it's declared for targetScope_.
   * @type {!Object.<string, !Object>}
   * @private
   */
  this.variablesInScope_ = {};

  /**
   * Stack of all previous stack frames.
   * @type {!Array.<Array.<Object>>}
   * @private
   */
  this.stackFrames_ = [];

  /**
   * Array of all variables declared in the current frame.
   * @type {!Array.<Object>}
   * @private
   */
  this.currentFrame_ = [];

  /**
   * Array mapping the ID of a scope to all variables declared in that scope.
   * @type {!Object.<number, !Array.<Object>>}
   * @private
   */
  this.scopeIdToFrame_ = {};

  /**
   * Array of parameters declared in the current function's scope.
   * @type {!Array.<Object>}
   * @private
   */
  this.scopeParameters_ = [];
};
goog.inherits(glslunit.VariableScopeVisitor, glslunit.ASTVisitor);


/**
 * Gets the map of variables to their declarators in the current scope.
 * @return {!Object} Map of variable names declared in or above the
 *     scope passed in the constructor to their declaring nodes.  The declaring
 *     nodes can either be parameter nodes or declarator nodes.
 */
glslunit.VariableScopeVisitor.prototype.getCurrentScopeVariables = function() {
  var frames = this.stackFrames_.concat([this.currentFrame_]);
  var variablesInScope = {};
  goog.array.forEachRight(frames, function(frame) {
    goog.array.forEach(frame, function(variable) {
      // For each variable declared in the frame, add it to our map of
      // variables.  We have to check to see if the variable is already in our
      // map of variables before adding it because GLSL allows you to redefine
      // variables within a new scope.  Since we are working from the right
      // backwards, this will only add a variable at it's lowest declared
      // scope.
      if (variable.type == 'declarator') {
        goog.array.forEach(variable.declarators, function(declarator) {
          if (!goog.isDef(variablesInScope[declarator.name.name])) {
            variablesInScope[declarator.name.name] = variable;
          }
        }, this);
      } else if (variable.type == 'parameter') {
        // Parameters can't be redefined, so always stomp over whatever is
        // there.
        variablesInScope[variable.name] = variable;
      }
    }, this);
  }, this);
  return variablesInScope;
};


/**
 * Visits a Scope node, pushing any variables declared above its stack frame
 * onto stackFrame_.
 * @param {!Object} node The scope node being visited.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.beforeVisitScope = function(node) {
  this.stackFrames_.push(this.currentFrame_);
  this.currentFrame_ = [];
  // If this scope was under a function declaration, add the parameters to this
  // frame's scope.
  [].push.apply(this.currentFrame_, this.scopeParameters_);
  // We only need to add the parameters to the outermost scope in a function.
  this.scopeParameters_ = [];
};


/**
 * If node == this.targetScope_, saves all variables declared within node's
 * scope and any stack frames above node in scopeParameters_, then pops the
 * current frame off of the stack.
 * @param {!Object} node The scope node being visited.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.afterVisitScope = function(node) {
  this.scopeIdToFrame_[node.id] = this.currentFrame_;
  if (node == this.targetScope_) {
    this.variablesInScope_ = this.getCurrentScopeVariables();
  }
  this.currentFrame_ = this.stackFrames_.pop();
};


/**
 * Reroutes visitRoot to call visitScope
 * @param {!Object} node The scope node being visited.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.beforeVisitRoot =
  glslunit.VariableScopeVisitor.prototype.beforeVisitScope;


/**
 * Reroutes visitPreprocessor to call visitScope
 * @param {!Object} node The scope node being visited.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.afterVisitPreprocessor =
    function(node) {
  if (!this.promoteIfdefVars_) {
    this.afterVisitScope(node);
  }
};


/**
 * Reroutes visitPreprocessor to call visitScope
 * @param {!Object} node The scope node being visited.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.beforeVisitPreprocessor =
    function(node) {
  if (!this.promoteIfdefVars_) {
    this.beforeVisitScope(node);
  }
};


/**
 * Reroutes visitRoot to call visitScope
 * @param {!Object} node The scope node being visited.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.afterVisitRoot =
  glslunit.VariableScopeVisitor.prototype.afterVisitScope;


/**
 * Pushes the variable declarator onto the current frame.
 * @param {!Object} node The variable declarator node.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.beforeVisitDeclarator = function(node) {
  this.currentFrame_.push(node);
};


/**
 * Stores the parameters declared in the function declaration and recurses
 * through the function declaration's children.
 * @param {!Object} node The function declaration node.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.beforeVisitFunctionDeclaration =
    function(node) {
  this.scopeParameters_ = node.parameters;
};


/**
 * Stores resets the current scope's parameters to an empty array.
 * @param {!Object} node The function declaration node.
 * @export
 */
glslunit.VariableScopeVisitor.prototype.afterVisitFunctionDeclaration =
    function(node) {
  this.scopeParameters_ = [];
};


/**
 * Generates a map of the ID of a scope node to all variables declared within
 *     that scope.
 * @param {!Object} rootAst The root of the AST we're getting the scope map for.
 * @return {!Object.<number, !Array.<Object>>} The map of scope id to the
 *     variables declared within that scope.
 * @export
 */
glslunit.VariableScopeVisitor.getScopeToDeclarationMap = function(rootAst) {
  var visitor = new glslunit.VariableScopeVisitor();
  visitor.visitNode(rootAst);
  return visitor.scopeIdToFrame_;
};


/**
 * Gets the variables in or above the scope requested.
 * @param {!Object} rootAst The root node of the AST.
 * @param {!Object} targetScope The scope whose variables we're collecting.
 * @param {boolean=} opt_promotePreprocessorVars Whether or not variables
 *     declared inside of an preprocessor statement will be considered part of
 *     their parent's scope.  Defaults to false.
 * @return {!Object.<string, !Object>} Map of variable names declared in
 *     or above the scope passed in the constructor to their declaring nodes.
 *     The declaring nodes can either be parameter nodes or declarator nodes.
 */
glslunit.VariableScopeVisitor.getVariablesInScope =
    function(rootAst, targetScope, opt_promotePreprocessorVars) {
  var visitor = new glslunit.VariableScopeVisitor(targetScope,
                                                  opt_promotePreprocessorVars);
  visitor.visitNode(rootAst);
  return visitor.variablesInScope_;
};
