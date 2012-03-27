// Start with testing the fragment shader.  Tests are broken up into TestSuites.
// There can be multiple test suites per file, but generally we want to create
// one test suite per shader type, so one test suite for the fragment shader,
// one test suite for the vertex shader.  We declare a test suite like below.
// fragmentTestSutie('Test Description',
//                   'Source code of fragment shader',
//                   function () {
//                       Declare test cases here
//                   });
fragmentTestSuite('Fragment Shader Test', shaderCode, function() {
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