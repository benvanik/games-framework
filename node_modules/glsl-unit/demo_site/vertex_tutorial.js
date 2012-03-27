// Testing Vertex Shaders is nearly identical to testing fragment shaders.
// The only difference is we now use vertexTestSuite instead of
// fragmentTestSuite.
vertexTestSuite('Vertex Shader Test', shaderCode, function() {
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
      .notEqual(2.5)
      .withEpsilonOf(0.1);
  });
});