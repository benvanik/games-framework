// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Test cases for the NameGenerator.
 * @author rowillia@google.com (Roy Williams)
 */

goog.require('glslunit.compiler.NameGenerator');
goog.require('goog.testing.jsunit');



function testNameGenerator() {
  assertEquals('a', glslunit.compiler.NameGenerator.getShortName(0));
  assertEquals('_a', glslunit.compiler.NameGenerator.getShortDef(0));
  assertEquals('b', glslunit.compiler.NameGenerator.getShortName(1));
  assertEquals('Z', glslunit.compiler.NameGenerator.getShortName(51));
  assertEquals('ba', glslunit.compiler.NameGenerator.getShortName(53));
  assertEquals('a0', glslunit.compiler.NameGenerator.getShortName(62 * 52));
  assertEquals('aaa',
               glslunit.compiler.NameGenerator.getShortName((62 * 52) + 52));
}



function testNameGeneratorInstance() {
  var generator = new glslunit.compiler.NameGenerator();
  generator.usedKeys_['c'] = true;
  assertEquals('a', generator.shortenSymbol('foo'));
  assertEquals('a', generator.shortenSymbol('foo'));
  assertEquals('b', generator.shortenSymbol('bar'));
  var clone = generator.clone();
  assertEquals('d', clone.shortenSymbol('raz'));
  assertEquals('raz', generator.getShortSymbol('raz'));
  assertEquals(2, generator.getNextNameIndex());
  assertEquals(4, clone.getNextNameIndex());
}
