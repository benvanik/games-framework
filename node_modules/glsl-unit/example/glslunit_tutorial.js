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




// GLSL Unit is a framework for unit testing GLSL code directly on the graphics
// card.  It makes it easy for a developer to specify inputs to their shader
// program and what their expected result is without having to set up their
// entire rendering pipeline.  This file will provide a tutorial on how to use
// GLSL Unit.
//
// This file has highly detailed comments on how the framework itself works.
// For a template you can copy and paste, see glslunit_template.js
//
// First, we need to require the GlslJstdAdapter so we can have our test case
// run in JSTD.  It will also take care of all of the bootstrapping of creating
// a test canvas for us.
goog.require('glslunit.testing.GlslJstdAdapter');

// Let's create some simple shaders to test.  We just need a string
// representation of the shader program.
var testVertexShaderCode =
  'uniform vec4 uTestLocation;' +
  'uniform mat4 uTestMatrix;' +
  'attribute float aMultiplier;' +
  'void main(void) {' +
    'gl_Position = aMultiplier * uTestMatrix * uTestLocation;' +
  '}';

var testFragmentShaderCode =
  'varying vec4 uTestColor;' +
  'uniform mat4 uTestMatrix;' +
  'uniform sampler2D uSomeTexture;' +
  'void main(void) {' +
    // Notice the use of a built in variable
    'if (!gl_FrontFacing) {' +
    // And the use of Discard.
    '  discard;' +
    '}' +
    'gl_FragColor = uTestMatrix * uTestColor;' +
  '}';

// Start with testing the fragment shader.  Tests are broken up into TestSuites.
// There can be multiple test suites per file, but generally we want to create
// one test suite per shader type, so one test suite for the fragment shader,
// one test suite for the vertex shader.  We declare a test suite like below.
// fragmentTestSutie('Test Description',
//                   'Source code of fragment shader',
//                   function () {
//                       Declare test cases here
//                   });
fragmentTestSuite('Fragment Shader Test', testFragmentShaderCode, function() {
  // Inside of a test suite, we have test cases.  Test cases can have a series
  // of input values they set, and a series of expectations they have.  Below we
  // call testMain, which will test the main function of a shader.  This is
  // useful to test the final output of a shader, be it built-ins such as
  // gl_FragColor or varyings.
  testMain('Fragment Test Case', function() {
    // Input Values
    // Input variables are set with this fluent interface.  We start with a call
    // to "set"
    // set('variable name')
    // which creates the variable.  We don't have to specify what the type or
    // qualifier is for this variable, the framework will infer it from the
    // source code.
    // We then use one of the as functions to specify what kind of data we want
    // to specify for this variable.  In the case below, we call "asArray" which
    // will expect an array of numbers to buffer.
    //
    // In addition to asArray, we can use:
    //   - asArray(/** @type Array.<number> */)
    //   - asNumber(/** @type number */)
    //   - asBoolean(/** @type boolean} */)
    //   - asSingeColor(/** @type Array.<number> length of 4*/)
    set('uTestColor').asArray([1, 2, 3, 1])
    // By default, GLSL Unit will use Int32Array for any integer types (int,
    // bool, ivec3, etc...) and Float32Array for any float types.  This can be
    // changed by calling "bufferedAs" with the type you'd like to be used for
    // buffering data.
    set('uTestMatrix').asArray([1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1])
                      .bufferedAs(Float32Array);
    // We can set any built-in variables as well as uniforms and varyings in a
    // Fragment shader test.
    set('gl_FrontFacing').asBoolean(true);
    // We can specify textures as well with asSingleColor.
    set('uSomeTexture').asSingleColor([127, 0, 0, 255]);

    // Expectations
    // After we set up the input values for our test case, we set up our
    // expectations that we have for that test case.  We set up expectations
    // first by making a call into expect(/** @type string */).  expect() will
    // create an expectation stub.  We on that stub, we can call:
    //
    //   -equal(/** @type {number|Array.<number>})
    //   -notEqual(/** @type {number|Array.<number>})
    //   -lessThan(/** @type {number|Array.<number>})
    //   -lessThanEqual(/** @type {number|Array.<number>})
    //   -greaterThan(/** @type {number|Array.<number>})
    //   -greaterThanEqual(/** @type {number|Array.<number>})
    //
    // Each of these functions will expect their corresponding comparisons to
    // return true.  If the expectation were to fail, the test case will log
    // what the actual value was.
    expect('gl_FragColor')
      .equal([1, 2, 3, 1])
      // Since dealing with floats is so prevalent in GLSL, we've built in the
      // ability to specify how much error will be allowed in
      // withEpsilonOf(/** @type {number} */).  The parameter to withEpsilonOf
      // sets the amount of absolute error allowed with making comparisons
      // before the expectation will fail.
      .withEpsilonOf(0.01);
    expect('texture2D(uSomeTexture, vec2(.5, .5))')
       // For vector comparisons, we can decide to expect to pass the
       // expectation if the comparison is true for any of the indices as
       // opposed to all of the indices.  We can change with by using the any()
       //  or all() functions.  Internally, in the GLSL this will either expect:
       //       - any(equal(texture2D(uSomeTexture, vec2(.5, .5)),
       //                   vec4(.5, 0., 0., 1.)))
       //       - all(equal(texture2D(uSomeTexture, vec2(.5, .5)),
       //                   vec4(.5, 0., 0., 1.)))
       // to return true (ignoring the epsilon code).
      .any()
      .equal([0.5, 0, 0, 1])
      .withEpsilonOf(0.01);
  });
  testMain('Discard Test Case', function() {
    // Input Values
    set('uTestColor').asArray([1, 2, 3, 1]);
    set('uTestMatrix').asArray([1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1]);
    set('gl_FrontFacing').asBoolean(false);
    set('uSomeTexture').asSingleColor([127, 0, 0, 255]);

    // Expectations
    // If we want to test that a shader discards, we can use expectDiscard().
    // We can't use expectDiscard with any other expectations because, by
    // definition, the shader will have discarded so there is no other data
    // we can extract.
    expectDiscard();
  });
});

// Testing Vertex Shaders is nearly identical to testing fragment shaders.
// The only difference is we now use vertexTestSuite instead of
// fragmentTestSuite.
vertexTestSuite('Vertex Shader Test', testVertexShaderCode, function() {
  testMain('Sample Test Case', function() {
    // Input Values
    set('uTestLocation').asArray([1, 2, 3, 1]);
    set('uTestMatrix').asArray([1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1]);
    // In a vertex test suite we can also set attributes as input.
    set('aMultiplier').asNumber(2);

    // Expectations
    // If we're comparing to a scalar, we can just pass in the scalar value
    // to the comparison function.
    // For notEqual, the epsilon will be treated as the threshold for which
    // the test value must be outside the expected value.  So, in the example
    // below, in order for this expectation to pass, gl_Position[0] must be:
    // 8.9 < gl_Position[0] || gl_Position[0] > 9.1
    expect('gl_Position[0]')
      .notEqual(2)
      .withEpsilonOf(0.1);
  });
});

