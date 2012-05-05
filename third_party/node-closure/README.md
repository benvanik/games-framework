# node-closure

Closure library wrapper for node.js.
Does execute closure scripts in same execution context while (optionally) in distinct global scope, what is a right thing to do.

Enjoy!

## Installation

Just copy closure.js, or using npm:

    npm install closure

## Introduction

To apply closure to global object:

    require('closure').Closure(global);

To create separate instance of closure

    var goog = require('closure').Closure();

By default closure library base.js is expected to be found in
./closure-library/closure/goog/, to override this, say:

    var goog = require('closure').Closure({CLOSURE_BASE_PATH: 'closure/goog/'});

To fetch additional closure dependencies:

    goog.loadScript('my_deps.js');

To easily access other namespaces than goog either apply closure to
global object or provide own global object, i.e.

    var root = {};
    require('closure').Closure(root);
    //root.goog is goog namespace
    //root.soy is soy namespace
