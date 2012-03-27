fragmentTestSuite('Heart Fragment Shader', shaderCode, function() {
  testMain('Outside of Heart Test Case', function() {
    // Input Values
    set('resolution').asArray([256, 384]);
    set('gl_FragCoord').asArray([0, 0, 0, 1]);

    // Expectations
    expect('gl_FragColor')
      .equal([0, 0, 0, 1])
      .withEpsilonOf(0.01);
  });
  testMain('Lower Left of Heart Test Case', function() {
    // Input Values
    set('resolution').asArray([256, 384]);
    set('gl_FragCoord').asArray([100, 100, 0, 1]);

    // Expectations
    expect('gl_FragColor')
      .greaterThanEqual([0.75, 0, 0, 1])
      .withEpsilonOf(0.01);

    expect('gl_FragColor')
      .lessThanEqual([0.9, 0, 0, 1])
      .withEpsilonOf(0.01);
  });
});