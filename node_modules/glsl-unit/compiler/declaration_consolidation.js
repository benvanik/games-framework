// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Optimizer that consolidates all variable declarations of the
 *     same type to one line.
 * @author rowillia@google.com (Roy Williams)
 */
goog.provide('glslunit.compiler.DeclarationConsolidation');

goog.require('glslunit.ASTTransformer');
goog.require('glslunit.Generator');
goog.require('glslunit.NodeCollector');
goog.require('glslunit.VariableScopeVisitor');
goog.require('glslunit.compiler.CompilerStep');
goog.require('glslunit.compiler.ShaderProgram');
goog.require('glslunit.compiler.Utils');
goog.require('goog.array');



/**
 * Optimizer consolidates declarations of variables into the same line.
 * @param {boolean} consolidateAttributes Whether or not to consolidate
 *     attributes.
 * @constructor
 * @extends {glslunit.ASTTransformer}
 * @implements {glslunit.compiler.CompilerStep}
 */
glslunit.compiler.DeclarationConsolidation = function(consolidateAttributes) {
  goog.base(this);

  /**
   * Map of the ID of a scope, root, or preprocessor node to an map of type
   * names to an array of all of the declarator items for that type.
   * @type {!Object.<number,
   *                 !Object.<string, Array.<!Object>>>}
   * @private
   */
  this.scopeIdToDeclarators_ = {};

  /**
   * Stores the declarator currently being transformed.
   * @type {Object}
   * @private
   */
  this.currentDeclarator_ = null;

  /**
   * Stack of maps mapping a type declaration to all declarators declaring
   * variables of that type.
   * @type {Array.<!Object.<string, Array.<!Object>>>}
   * @private
   */
  this.typeMapStack_ = [];

  /**
   * Set of node IDs that are initializers of for loops.
   * This is needed because GLSL doesn't allow initializers of for loops to be
   * declared outside of the for loop.
   * @type {Array.<boolean>}
   * @private
   */
  this.forInitializerNodes_ = [];

  /**
   * Set of node IDs that are declarators inside of struct definitions.
   * @type {Array.<boolean>}
   * @private
   */
  this.structDeclaratorNodes_ = [];

  /**
   * Whether or not to consolidate attribute values.
   * @type {boolean}
   * @private
   */
  this.consolidateAttributes_ = consolidateAttributes;
};
goog.inherits(glslunit.compiler.DeclarationConsolidation,
              glslunit.ASTTransformer);


/**
 * Before visiting the root node of the AST, we collect all variable
 * declarations under all scopes and populate an internal map of node IDs to
 * variables declared within that node.
 * @param {!Object} node The root node for the AST to transform.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.beforeTransformRoot =
      function(node) {
  // First, find all of the for loops and keep track of their initalizer nodes.
  // We also find all declarator nodes inside of struct definitions.
  var forNodes = glslunit.NodeCollector.collectNodes(node, function(x) {
    return x.type == 'for_statement';
  });
  goog.array.forEach(forNodes, function(forNode) {
    this.forInitializerNodes_[forNode.initializer.id] = true;
  }, this);

  this.structDeclaratorNodes_ =
    glslunit.compiler.Utils.getStructDeclarations(node);

  // Second, gather all declarations and organize them by scope and type.
  var scopeDeclarations =
      glslunit.VariableScopeVisitor.getScopeToDeclarationMap(node);

  // For each scope underneath the root node, organize all variable declarations
  // according to type, and store a map of type to declaration for each scope.
  for (var scope in scopeDeclarations) {
    var typeToVars =
      /** @type {!Object.<string, Array.<!Object>>} */({});
    var variablesInScope = scopeDeclarations[/** @type {number} */(scope)];
    goog.array.forEach(variablesInScope, function(variable) {
      // We are only interested in declarators, not parameters.
      if (variable.type == 'declarator' &&
          this.shouldConsolidateDeclarator_(variable, scope == node.id)) {
        var typeStr = glslunit.Generator.getSourceCode(variable.typeAttribute);
        // If the map of types to variable declarations in this scope doesn't
        // have an entry yet, create one.
        if (!typeToVars[typeStr]) {
          typeToVars[typeStr] = [];
        }
        // For each of the declarators in this variable declaration, add an
        // entry to the map of types to variable declarations.
        goog.array.forEach(variable.declarators, function(declarator) {
          // Create a new node stripping an initializers.
          var newDeclarator = declarator;
          // Only create a duplicate node if we need to.
          if (newDeclarator.initializer) {
            newDeclarator = glslunit.ASTTransformer.cloneNode(declarator);
            delete newDeclarator.initializer;
          }
          typeToVars[typeStr].push(newDeclarator);
        }, this);
      }
    }, this);
    this.scopeIdToDeclarators_[/** @type {number} */(scope)] = typeToVars;
  }
  this.beforeTransformScope(node);
};


/**
 * Stores the current declarator.
 * @param {!Object} node The node to be transformed.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.
    beforeTransformDeclarator = function(node) {
  this.currentDeclarator_ = node;
};


/**
 * Clears the current declarator.
 * @param {!Object} node The node to be transformed.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.
    afterTransformDeclarator = function(node) {
  this.currentDeclarator_ = null;
};


/**
 * Pushes the type map for this scope onto the stack.
 * @param {!Object} node The node to be transformed.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.
    beforeTransformScope = function(node) {
  this.typeMapStack_.push(this.scopeIdToDeclarators_[node.id]);
};


/**
 * Pushes the type map for this scope onto the stack.
 * @param {!Object} node The node to be transformed.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.
    beforeTransformPreprocessor =
        glslunit.compiler.DeclarationConsolidation.prototype.
            beforeTransformScope;


/**
 * Pops the type map stack.
 * @param {!Object} node The node to be transformed.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.
    afterTransformScope = function(node) {
  this.typeMapStack_.pop();
};


/**
 * Pops the type map stack.
 * @param {!Object} node The node to be transformed.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.
    afterTransformPreprocessor =
        glslunit.compiler.DeclarationConsolidation.prototype.
            afterTransformScope;


/**
 * Determines whether or not a given declarator should have it's declarations
 * consolidated.
 * @param {!Object} declarator The declarator to check for consolidation.
 * @param {boolean} isGlobal Whether or not this variable is a global variable.
 * @return {boolean} Whether or not declarator should be consolidated.
 * @private
 */
glslunit.compiler.DeclarationConsolidation.prototype.
    shouldConsolidateDeclarator_ = function(declarator, isGlobal) {
  var typeStr = glslunit.Generator.getSourceCode(declarator.typeAttribute);
  var declarator_items = null;
  if (this.typeMapStack_.length > 0) {
    declarator_items = this.typeMapStack_.slice(-1)[0][typeStr];
  }
  return (declarator != null &&
          (this.consolidateAttributes_ ||
              declarator.typeAttribute.qualifier != 'attribute') &&
          declarator.typeAttribute.qualifier != 'const' &&
          (!declarator_items || declarator_items.length > 1) &&
          !(declarator.id in this.forInitializerNodes_) &&
          !(declarator.id in this.structDeclaratorNodes_) &&
          // If this is a global scope declaration, we can't consolidate the
          // declarator items if they have initializers since we wouldn't be
          // able to move the initialization to a new line.  Once we do some
          // fancy SSA work we could possibly consolidate them IF they don't
          // depend on any other state, but not yet.
          !(isGlobal &&
            !goog.array.every(declarator.declarators, function(x) {
              return !goog.isDef(x.initializer);
            })));
};


/**
 * Removes any inline declarations from within a scope and transforms
 * initalizers into assignments.
 * @param {!Object} node The node to be transformed.
 * @return {Object} Null if the node has no initializer, otherwise returns an
 *     assignment operation node to set the variable's value.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.transformDeclaratorItem =
    function(node) {
  // Leave attributes in place
  if (!this.shouldConsolidateDeclarator_(
      /** @type ! {Object} */ (this.currentDeclarator_),
      this.typeMapStack_.length == 1)) {
    return node;
  }
  if (node.initializer) {
    // If this declaration has an initializer, re-write it as a binary
    // assignment expression.  We expect the transformDecalartor function to
    // then inline these assignment expressions where the initial declaration
    // was.
    var newNode = {
      id: glslunit.ASTTransformer.getNextId(),
      type: 'expression',
      expression: {
        id: glslunit.ASTTransformer.getNextId(),
        type: 'binary',
        operator: {
          id: glslunit.ASTTransformer.getNextId(),
          type: 'operator',
          operator: '='
        },
        left: node.name,
        right: node.initializer
      }
    };
    return newNode;
  } else {
    // Returning null will remove this node from the AST.  The declarator will
    // be re-added during transformScope or transformPreprocessor.
    return null;
  }
};


/**
 * If this declarator is the first of it's type with in the current scope, then
 * inline all declarations of this type with this node.  If this node had
 * declarator items that were initalized, append the new assignment operations
 * that replace the initialization after any inlined declarators.
 * @param {!Object} node The node to be transformed.
 * @return {Object} The transformed declarator node.
 * @export
 */
glslunit.compiler.DeclarationConsolidation.prototype.transformDeclarator =
    function(node) {
  // Leave attributes in place
  if (!this.shouldConsolidateDeclarator_(node,
      this.typeMapStack_.length == 1)) {
    return node;
  }
  var result = [];
  var typeStr = glslunit.Generator.getSourceCode(node.typeAttribute);
  var currentTypeMap = this.typeMapStack_.slice(-1)[0];
  var scopeDeclarations = currentTypeMap[typeStr];
  if (scopeDeclarations) {
    var declaratorNode = glslunit.ASTTransformer.cloneNode(node);
    declaratorNode.declarators = scopeDeclarations;
    result = [declaratorNode];
    delete currentTypeMap[typeStr];
  }
  // All assignment operations should be placed after the declarations.
  if (node.declarators && node.declarators.length != 0) {
    // All still valid declarators should have been re-written as binary
    // assignment operators.  Returning this array of declarators will inline
    // them where the original declaration was in the order the variables were
    // initially declared.
    Array.prototype.push.apply(result, node.declarators);
  }
  return result;
};


/**
 * The name of this compilation step.
 * @type {string}
 * @const
 */
glslunit.compiler.DeclarationConsolidation.NAME = 'DeclarationConsolidation';


/** @override */
glslunit.compiler.DeclarationConsolidation.prototype.getName = function() {
  return glslunit.compiler.DeclarationConsolidation.NAME;
};


/** @override */
glslunit.compiler.DeclarationConsolidation.prototype.getDependencies =
    function() {
  return [];
};


/** @override */
glslunit.compiler.DeclarationConsolidation.prototype.performStep =
    function(stepOutputMap, shaderProgram) {
  var vertexTransformer = new glslunit.compiler.DeclarationConsolidation(
      this.consolidateAttributes_);
  var fragmentTransformer = new glslunit.compiler.DeclarationConsolidation(
      this.consolidateAttributes_);
  shaderProgram.vertexAst =
      vertexTransformer.transformNode(shaderProgram.vertexAst);
  shaderProgram.fragmentAst =
      fragmentTransformer.transformNode(shaderProgram.fragmentAst);
  return [];
};
