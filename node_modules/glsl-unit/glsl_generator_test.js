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
 * @fileoverview Test cases for the GLSL Generator.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.Generator');
goog.require('goog.testing.jsunit');


function testVisitIdentifier() {
  var identifierNode = {
    type: 'identifier',
    name: 'oh_hai'
  };
  assertEquals('oh_hai', glslunit.Generator.getSourceCode(identifierNode));
}

function testVisitBinary() {
  var leftNode = {
    type: 'identifier',
    name: 'x'
  };
  var rightNode = {
    type: 'identifier',
    name: 'y'
  };
  var testNode = {
    type: 'binary',
    operator: {
      type: 'operator',
      operator: '*'
    },
    left: leftNode,
    right: rightNode
  };
  assertEquals('x*y', glslunit.Generator.getSourceCode(testNode));
}

function testVisitTernary() {
  var trueNode = {
    type: 'identifier',
    name: 'x'
  };
  var falseNode = {
    type: 'identifier',
    name: 'y'
  };
  var testNode = {
    type: 'ternary',
    condition: {
      type: 'bool',
      value: false
    },
    is_true: trueNode,
    is_false: falseNode
  };
  assertEquals('false?x:y', glslunit.Generator.getSourceCode(testNode));
}

function testTernaryChild() {
  var testNode = {
    type: 'binary',
    operator: {
      type: 'operator',
      operator: '*'
    },
    left: {
      type: 'float',
      value: 1
    },
    right: {
      type: 'ternary',
      condition: {
        type: 'bool',
        value: 'false'
      },
      is_true: {
        type: 'float',
        value: 1
      },
      is_false: {
        type: 'float',
        value: 0
      }
    }
  };
  assertEquals('1.*(false?1.:0.)', glslunit.Generator.getSourceCode(testNode));
}

function testVisitBinaryWithParen() {
  var leftNode = {
    type: 'binary',
    operator: {
      type: 'operator',
      operator: '/'
    },
    left: {
      type: 'identifier',
      name: 'x'
    },
    right: {
      type: 'binary',
      operator: {
        type: 'operator',
        operator: '*'
      },
      left: {
        type: 'identifier',
        name: 'z'
      },
      right: {
        type: 'binary',
        operator: {
          type: 'operator',
          operator: '*'
        },
        left: {
          type: 'identifier',
          name: 'u'
        },
        right: {
          type: 'function_call',
          function_name: 'test',
          parameters: []
        }
      }
    }
  };
  var rightNode = {
    type: 'binary',
    operator: {
      type: 'operator',
      operator: '-'
    },
    left: {
      type: 'identifier',
      name: 'a'
    },
    right: {
      type: 'binary',
      operator: {
        type: 'operator',
        operator: '-'
      },
      left: {
        type: 'identifier',
        name: 'b'
      },
      right: {
        type: 'identifier',
        name: 'c'
      }
    }
  };
  var testNode = {
    type: 'binary',
    operator: {
      type: 'operator',
      operator: '*'
    },
    left: leftNode,
    right: rightNode
  };
  assertEquals('x/(z*u*test())*(a-(b-c))',
               glslunit.Generator.getSourceCode(testNode));
}

function testVisitValue() {
  var testNode = {
    type: 'int',
    value: 256
  };
  assertEquals('256', glslunit.Generator.getSourceCode(testNode));
  var testNode = {
    type: 'int',
    value: 1099511627775
  };
  assertEquals('0xffffffffff', glslunit.Generator.getSourceCode(testNode));
  var testNode = {
    type: 'int',
    value: -1099511627775
  };
  assertEquals('-0xffffffffff', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'bool',
    value: true
  };
  assertEquals('true', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: 1e-23
  };
  assertEquals('1e-23', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: 42
  };
  assertEquals('42.', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: 0.42
  };
  assertEquals('.42', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: 0.000001
  };
  assertEquals('1e-6', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: -0.00000523
  };
  assertEquals('-5.23e-6', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: 10000
  };
  assertEquals('1e4', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: 1000
  };
  assertEquals('1e3', glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'float',
    value: 320000
  };
  assertEquals('3.2e5', glslunit.Generator.getSourceCode(testNode));
}

function testFunctionCall() {
  var testNode = {
    type: 'function_call',
    function_name: 'test',
    parameters: []
  };
  assertEquals('test()', glslunit.Generator.getSourceCode(testNode));
  testParameter = {
      type: 'identifier',
      name: 'a'
  };
  testNode.parameters = [testParameter, testParameter, testParameter];
  assertEquals('test(a,a,a)', glslunit.Generator.getSourceCode(testNode));
}

function testPostfix() {
  var testNode = {
    type: 'postfix',
    operator: {
      type: 'accessor',
      index: {
         type: 'int',
         value: 42
      }
    },
    expression: {
      type: 'identifier',
      name: 'x'
    }
  };
  assertEquals('x[42]', glslunit.Generator.getSourceCode(testNode));
  testNode.operator = {
    type: 'field_selector',
    selection: 'rgba'
  };
  assertEquals('x.rgba', glslunit.Generator.getSourceCode(testNode));
  testNode.operator = {
    type: 'operator',
    operator: '++'
  };
  assertEquals('x++', glslunit.Generator.getSourceCode(testNode));
}

function testUnary() {
  var testNode = {
    type: 'unary',
    expression: {
      type: 'identifier',
      name: 'x'
    },
    operator: {
      type: 'operator',
      operator: '-'
    }
  };
  assertEquals('-x', glslunit.Generator.getSourceCode(testNode));

  var binaryNode = {
    type: 'binary',
    operator: {
      type: 'operator',
      operator: '-'
    },
    left: {
      type: 'identifier',
      name: 'y'
    },
    right: testNode
  };
  assertEquals('y- -x', glslunit.Generator.getSourceCode(binaryNode));
}

function testJump() {
  var testNode = {
    type: 'return',
    value: {
      type: 'identifier',
      name: 'to_sender'
    }
  };
  assertEquals('return to_sender;', glslunit.Generator.getSourceCode(testNode));
  delete testNode.value;
  assertEquals('return;', glslunit.Generator.getSourceCode(testNode));
  testNode.type = 'continue';
  assertEquals('continue;', glslunit.Generator.getSourceCode(testNode));
  testNode.type = 'break';
  assertEquals('break;', glslunit.Generator.getSourceCode(testNode));
  testNode.type = 'discard';
  assertEquals('discard;', glslunit.Generator.getSourceCode(testNode));
}

function testExpression() {
  var testNode = {
    type: 'expression',
    expression: {
      type: 'binary',
      operator: {
        type: 'operator',
        operator: '-='
      },
      left: {
        type: 'identifier',
        name: 'x'
      },
      right: {
        type: 'int',
        value: 12
      }
    }
  };
  assertEquals('x-=12;', glslunit.Generator.getSourceCode(testNode));
}

function testType() {
  var testNode = {
    type: 'type',
    name: 'vec4'
  };
  assertEquals('vec4', glslunit.Generator.getSourceCode(testNode));
  testNode.qualifier = 'invariant varying';
  assertEquals('invariant varying vec4',
               glslunit.Generator.getSourceCode(testNode));
  testNode.precision = 'highp';
  assertEquals('invariant varying highp vec4',
               glslunit.Generator.getSourceCode(testNode));
}

function testDeclarator() {
  var testNode = {
    type: 'declarator',
    typeAttribute: {
      type: 'type',
      name: 'int'
    },
    declarators: [
      {
         type: 'declarator_item',
         name: {
            type: 'identifier',
            name: 'foo'
         },
         isArray: true
      }
   ]
  };
  assertEquals('int foo[];', glslunit.Generator.getSourceCode(testNode));
  testNode.declarators[0].arraySize = {
      type: 'int',
      value: 1
   };
   testNode.declarators = testNode.declarators.concat({
       type: 'declarator_item',
       name: {
          type: 'identifier',
          name: 'bar'
       },
       initializer: {
          type: 'int',
          value: 12
       }
     });
  assertEquals('int foo[1],bar=12;',
               glslunit.Generator.getSourceCode(testNode));
}

function testIfStatement() {
  var testNode = {
    type: 'if_statement',
    condition: {
      type: 'bool',
      value: true
    },
    body: {
      type: 'return',
      value: {
        type: 'bool',
        value: false
      }
    }
  };
  assertEquals('if(true)return false;',
               glslunit.Generator.getSourceCode(testNode));
  var bodyStatements = [testNode.body].concat({
     type: 'expression',
     expression: {
      type: 'binary',
      operator: {
        type: 'operator',
        operator: '-='
      },
      left: {
        type: 'identifier',
        name: 'x'
      },
      right: {
        type: 'int',
        value: 12
      }
    }
  });
  testNode.body = {
    type: 'scope',
    statements: bodyStatements
  };
  assertEquals('if(true){return false;x-=12;}',
               glslunit.Generator.getSourceCode(testNode));
  var oldBody = testNode.body;
  testNode.body = {
    type: 'scope',
    statements: []
  };
  testNode.elseBody = oldBody;
  assertEquals('if(true){}else{return false;x-=12;}',
               glslunit.Generator.getSourceCode(testNode));
  testNode.elseBody = oldBody.statements[0];
  assertEquals('if(true){}else return false;',
               glslunit.Generator.getSourceCode(testNode));
}

function testForLoop() {
  var testNode = {
    type: 'for_statement',
    initializer: {
       type: 'declarator',
       typeAttribute: {
          type: 'type',
          name: 'int'
       },
       declarators: [
          {
             type: 'declarator_item',
             name: {
                type: 'identifier',
                name: 'i'
             },
             initializer: {
                type: 'int',
                value: 0
             }
          }
       ]
    },
    condition: {
      type: 'binary',
       operator: {
         type: 'operator',
         operator: '<'
       },
      left: {
         type: 'identifier',
        name: 'i'
      },
      right: {
         type: 'int',
         value: 23
      }
    },
    increment: {
      type: 'postfix',
      operator: {
        type: 'operator',
        operator: '++'
      },
      expression: {
         type: 'identifier',
         name: 'i'
      }
    },
    body: {
      type: 'scope',
      statements: []
    }
  };
  assertEquals('for(int i=0;i<23;i++){}',
               glslunit.Generator.getSourceCode(testNode));
  testNode.body = {
    type: 'return',
    value: {
       type: 'bool',
       value: false
    }
  };
  assertEquals('for(int i=0;i<23;i++)return false;',
               glslunit.Generator.getSourceCode(testNode));
  testNode.body = {
    type: 'scope',
    statements: [testNode.body, testNode.body]
  };
  assertEquals('for(int i=0;i<23;i++){return false;return false;}',
               glslunit.Generator.getSourceCode(testNode));
}

function testWhile() {
  var testNode = {
    type: 'while_statement',
    condition: {
      type: 'binary',
      operator: {
        type: 'operator',
        operator: '<'
      },
      left: {
         type: 'identifier',
         name: 'i'
      },
      right: {
         type: 'int',
         value: 23
      }
    },
    body: {
      type: 'scope',
      statements: []
    }
  };
  assertEquals('while(i<23){}', glslunit.Generator.getSourceCode(testNode));
}

function testDo() {
  var testNode = {
    type: 'do_statement',
    condition: {
      type: 'binary',
      operator: {
        type: 'operator',
        operator: '<'
      },
      left: {
        type: 'identifier',
        name: 'i'
      },
      right: {
        type: 'int',
        value: 23
      }
    },
    body: {
      type: 'scope',
      statements: []
    }
  };
  assertEquals('do{}while(i<23)', glslunit.Generator.getSourceCode(testNode));
  testNode.body = {
    type: 'return',
    value: {
       type: 'bool',
       value: false
    }
  };
  assertEquals('do return false;while(i<23)',
               glslunit.Generator.getSourceCode(testNode));
}

function testPreprocessor() {
  var testNode = {
          type: 'preprocessor',
          directive: '#define',
          identifier: 'FOO',
          token_string: 'a + b - 1.0',
          parameters: [
            {
              type: 'identifier',
              name: 'a'
            },
            {
              type: 'identifier',
              name: 'b'
            }
          ]
        };
        assertEquals('#define FOO(a,b) a + b - 1.0\n',
                     glslunit.Generator.getSourceCode(testNode));
  testNode = {
    type: 'preprocessor',
    directive: '#ifdef',
    value: 'FOO'
  };
  assertEquals('#ifdef FOO\n', glslunit.Generator.getSourceCode(testNode));
  testNode.guarded_statements = [{
    type: 'return',
    value: {
       type: 'bool',
       value: false
    }
  }];
  assertEquals('#ifdef FOO\nreturn false;\n#endif\n',
               glslunit.Generator.getSourceCode(testNode));
  testNode.elseBody = {
      type: 'preprocessor',
      directive: '#else',
      guarded_statements: testNode.guarded_statements
    };
  assertEquals('#ifdef FOO\\nreturn false;\\n' +
               '#else\\nreturn false;\\n#endif\\n',
               glslunit.Generator.getSourceCode(testNode, '\\n'));
}

function testFunction() {
  var testNode = {
      type: 'function_prototype',
      name: 'foo',
      returnType: {
        type: 'type',
        name: 'int',
        precision: 'highp'
      },
      parameters: [
         {
            type: 'parameter',
            type_name: 'int',
            name: 'x',
            typeQualifier: 'const',
            parameterQualifier: 'in',
            precision: 'highp',
            arraySize: {
               type: 'int',
               value: 4
            }
         },
         {
            type: 'parameter',
            type_name: 'int',
            name: 'y'
         }
      ]
  };
  assertEquals('highp int foo(const in highp int x[4],int y);',
               glslunit.Generator.getSourceCode(testNode));
  testNode.type = 'function_declaration';
  delete testNode.returnType.precision;
  testNode.body = {
    type: 'scope',
    statements: []
  };
  assertEquals('int foo(const in highp int x[4],int y){}',
               glslunit.Generator.getSourceCode(testNode));
  testNode.body.statements = [
    {
      type: 'return',
      value: {
        type: 'bool',
        value: false
      }
    },
    {
       type: 'expression',
       expression: {
         type: 'postfix',
         operator: {
           type: 'operator',
           operator: '++'
         },
         expression: {
            type: 'identifier',
            name: 'i'
         }
       }
    }
  ];
  assertEquals('int foo(const in highp int x[4],int y){return false;i++;}',
               glslunit.Generator.getSourceCode(testNode));
}

function testInvariant() {
  var testNode = {
    type: 'invariant',
    identifiers: [
       {
          type: 'identifier',
          name: 'foo'
       },
       {
          type: 'identifier',
          name: 'bar'
       }
    ]
  };
  assertEquals('invariant foo,bar;',
               glslunit.Generator.getSourceCode(testNode));
}

function testPrecision() {
  var testNode = {
    type: 'precision',
    precision: 'highp',
    typeName: 'float'
  };
  assertEquals('precision highp float;',
               glslunit.Generator.getSourceCode(testNode));
}

function testStructDefinition() {
  var testNode = {
      type: 'struct_definition',
      members: [
         {
            type: 'declarator',
            typeAttribute: {
               type: 'type',
               name: 'int'
            },
            declarators: [
              {
                  type: 'declarator_item',
                  name: {
                    type: 'identifier',
                    name: 'x'
                  }
               }
            ]
         },
         {
            type: 'declarator',
            typeAttribute: {
               type: 'type',
               name: 'int'
            },
            declarators: [
               {
                  type: 'declarator_item',
                  name: {
                    type: 'identifier',
                    name: 'y'
                  }
               }
            ]
         }
      ],
      name: 'testStruct',
      qualifier: 'attribute',
      declarators: [
         {
            type: 'declarator_item',
            name: {
              type: 'identifier',
              name: 'z'
            }
         }
      ]
   };
   assertEquals('attribute struct testStruct{int x;int y;}z;',
                glslunit.Generator.getSourceCode(testNode));
   delete testNode.name;
   delete testNode.qualifier;
   delete testNode.declarators;
   assertEquals('struct{int x;int y;};',
                glslunit.Generator.getSourceCode(testNode));
}
