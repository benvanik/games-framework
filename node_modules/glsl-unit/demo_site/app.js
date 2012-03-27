GLSLUnitExample = function(name, glslUri, jsTestUri) {
  this.name = name;
  this.glslUri = glslUri;
  this.jsTestUri = jsTestUri;
  this.glslSource = ''
  this.testJsSource = '';
}

GLSLUnitExampleController = function($xhr) {
  this.examples = [
    new GLSLUnitExample('Fragment Tutorial',
                        'fragment_tutorial.glsl',
                        'fragment_tutorial.js'),
    new GLSLUnitExample('Vertex Tutorial',
                        'vertex_tutorial.glsl',
                        'vertex_tutorial.js'),
    new GLSLUnitExample('Heart Shader Example',
                        'heart_shader_example.glsl',
                        'heart_shader_example.js')
  ];
  this.selectedExample = this.examples[0];
  this.glslSource = '';
  this.testJsSource = '';
  this.gl = null;
  this.lastTestRun = null;
  this.errorText = null;

  this.initSamples($xhr);
  this.initGL();
};

GLSLUnitExampleController.prototype.initGL = function() {
  var canvas = $('#test-canvas')[0];
  var opts = {
    'antialias': false,
    'stencil': true,
    'preserveDrawingBuffer': true
  };
  try {
    this.gl = canvas.getContext('webgl', opts);
    if (!this.gl) this.gl = canvas.getContext('experimental-webgl', opts);
    if (!this.gl) this.gl = canvas.getContext('moz-webgl', opts);
    if (!this.gl) this.gl = canvas.getContext('webkit-3d', opts);
  } catch(e) {}

  if (!this.gl) {
    alert('Sorry, it appears your browser does not support WebGL');
    return;
  }
};

GLSLUnitExampleController.prototype.initSamples = function($xhr) {
  var self = this;
  $(this.examples).each(function(index) {
    var example = this;
    $xhr('GET', example.glslUri, function(code, response) {
      example.glslSource = response;
      if (example.name == self.selectedExample.name) {
        self.glslSource = example.glslSource;
      }
    });
    $xhr('GET', example.jsTestUri, function(code, response) {
      example.testJsSource = response;
      if (example.name == self.selectedExample.name) {
        self.testJsSource = example.testJsSource;
      }
    });
  });
};

GLSLUnitExampleController.prototype.initTestFramework = function(testSuites) {
  // Create the global function for declaring shader test cases.
  window['vertexTestSuite'] = function(suiteName, shader, suiteFn) {
    var newSuite = function(gl) {
      return new glslunit.testing.TestSuite(
        gl, 50, 50,
        glslunit.testing.TestCase.TestType.VERTEX,
        suiteName, shader, suiteFn);
    };
    testSuites.push(newSuite);
  };

  window['fragmentTestSuite'] = function(suiteName, shader, suiteFn) {
    var newSuite = function(gl) {
      return new glslunit.testing.TestSuite(
        gl, 50, 50,
        glslunit.testing.TestCase.TestType.FRAGMENT,
        suiteName, shader, suiteFn);
    };
    testSuites.push(newSuite);
  };
}

GLSLUnitExampleController.prototype.loadSelectedExample = function() {
  this.testJsSource = this.selectedExample.testJsSource;
  this.glslSource = this.selectedExample.glslSource;
};

GLSLUnitExampleController.prototype.runTest = function() {
  this.errorText = null;
  this.lastTestRun = null;
  var testSuitesConstructors = [];
  var testSuites = [];
  var shaderSourceStr = 'var shaderCode = [' + this.glslSource.split('\n').
                                                       map(function(x) {return '"' + x +'"'}).
                                                       join(',') + '].join("\\n");\n'
  this.initTestFramework(testSuitesConstructors);
  // Run the test cases.
  try {
    eval(shaderSourceStr + this.testJsSource);
    var gl = this.gl;
    $(testSuitesConstructors).each(function(index) {
      var testSuite = this(gl);
      testSuite.run();
      testSuites.push(testSuite);
    }) ;
    this.lastTestRun = testSuites;
  } catch (e) {
    this.errorText = e.message;
  }
};
