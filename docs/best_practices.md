Best Practices
========================================================================================================================
- - -

TODO!

# JavaScript/Closure

Writing code that is both minification-safe and portable requires discipline. Most of this is taken care of by using the
linter and compiler, but a developer must always be aware of the implications of what they write.

All GF framework code follows these practices, and it is strongly recommended that games built on top of it follow them
too to ensure the smallest, fastest, and most maintainable code possible.

## Always document everything

Documentation is hard to add after the code has been written. Document all classes and member values/functions as you
write them. This ensures that you are adding proper type information as well as documenting your intent.

Feel free to include TODO's in your comments if they are not temporary. Preferred style is:

```javascript
/**
 * Some method comment.
 * TODO(benvanik): add arguments for fob processing
 */
myproj.MyType.prototype.method = function() {
  // TODO(benvanik): adjust value by current rate
  this.value += 1;
};
```

## Always type everything

Closure Compiler can infer many types but that doesn't protect against programmer error. Prefer to include the
type information on parameters, returns, and members.

Always specify the nullability of a type. This means including (or omitting) `!` or `?`. It is much easier to maintain
a codebase from day-zero with nullability information than it is to later retrofit it in.

Be wary of anonymous objects. Not only does it indicate that garbage is being created, but they are difficult for
the compiler to verify. Either define a type definition via `@typedef` or preferrably a real type.

Check out the annoation document on the
[Closure annotations](http://code.google.com/closure/compiler/docs/js-for-compiler.html) page.

## Use goog.dom/goog.dom.style/etc

Never use window.document directly - instead, only once create a `goog.dom.DomHelper` and pass that around to all of
your code. This provides two benefits: smaller code size (goog.dom.DomHelper enables better minification) and the
ability to run in popup windows. When executing in popups window.document will not be the same as the hosting window,
and if you do not use the same document object many APIs will behave oddly/work incorrectly.

Example:

```javascript
// After this, never use window.document again
var dom = new goog.dom.DomHelper(); // (or pass in your document)
// You may not believe it, but this compiled code will be significantly smaller and be safe
// when running in popup windows
var div = dom.createElement(goog.dom.TagName.DIV);
dom.setTextContent(div, 'hello world');
dom.appendChild(dom.getDocument().body, div);
```

## Always use goog.getCssName (and CSS renaming)

Even if you are not currently using CSS renaming via Closure Stylesheets, prefer `goog.getCssName` over normal
embedded strings. When you do decide to use the compiler it will be much less work and you're less likely to miss
references.

```javascript
  goog.dom.classes.set(el, goog.getCssName('myLongClassName'));
  // If not using renaming, things are no worse when compiled:
  abc(e,'myLongClassName')
  // But if using renaming, this will be compiled to something much smaller:
  abc(e,'f2')
```

Always use camelCase class names, never hypenated ones. The Closure Stylesheets compiler splits on hypens and it leads
to much less optimal renaming.

```css
  .my-long-class-name {} -> .a-b-c-d {}
  .myLongClassName {} -> .a {}
```

## Never use the window object by name

Prefer `goog.global` vs. `window` when accessing global objects or types. goog.global is always defined, where as in
Web Workers and on node.js window is not. When doing feature detection to see if a type exists, always use goog.global.

Example:

```javascript
// DO NOT use this, it may compile incorrectly and will throw errors in Web Workers and node.js
var hasWebSockets = window.WebSocket;
// DO use this, it will work everywhere
var hasWebSockets = !!goog.global['WebSocket'];
```

## Be careful with console

The console object does not exist in Web Workers, and under certain browsers will throw errors. Instead, prefer to use
`gf.log`, which properly handles console behavior from Workers. Note that on normal pages in browsers `gf.log.write`
is just a reference to `console.log`, and as such the stack traces will be the same and there is no cost.

When writing workers, be sure to use `gf.log.installListener` to enable receiving logs.

## Use constants wherever possible, including WebGL

The Closure Compiler is really good at constant propagation so don't be afraid to use them. They increase readability
and will cost nothing once compiled.

When interacting with WebGL, prefer to use the constants defined on `goog.webgl` instead of those on the
WebGLRenderingContext. When you use `goog.webgl` the constants will be inlined at compile time, reducing code size
and improving performance (no property lookups, etc).

Example:

```javascript
/**
 * @const
 * @type {number}
 */
myproject.MyType.SOME_CONST = 5;

  // Deep inside code...
  var someMath = myproject.MyType.SOME_CONST + value;
```

```javascript
  gl.blendFunc(goog.webgl.ONE, goog.webgl.ZERO);
  // This is compiled to the much smaller const values, with no property lookups:
  gl.blendFunc(1,0);
```

## Guard all node.js code with gf.NODE

The `gf.NODE` define exists to aid in switching code that should run only in node.js. The value will only be true
when running (or compiling) in that environment, so be sure that any code requiring or creating node objects uses it.

The recommended abstraction pattern is to create a type, such as MyContentStorage, and subclass it based on HTML
storage or node.js storage, such as MyHtml5Storage and MyNodeStorage. This ensures a clean separation of browser
access (HTML5 Local Storage/etc) and node.js API use (File/databases) while leaving all shared code ignorant of the
backing.

It's not a requirement to wrap entire files in `if (gf.NODE) {}` blocks, as the Closure Compiler is smart enough to
not include that code. If you do notice it complaining when it shouldn't be, ensure you do not have any dependency
leakage.

## Never create garbage, stash temporaries on types

While it's true that garbage collectors are getting better, the fastest garbage collection is one that never occurs.
When writing code that executes frequently (several times per frame or more), prefer to stash objects on types instead
of allocating them. It may be nasty, but since there are no value types in Javascript it's the best we can do.

This technique is especially useful with math code, as it's easy to get in a situation where there are many thousands
of temporary vectors or matrices getting created each frame.

Note that it's best to store temporaries on types as `@private` instead of being tempted to share them globally.
If global, it would be easy for one method using the temporaries to overwrite another method in the stacks' usage.
If using recursion one will need another solution.

Example:

```javascript
mytype.prototype.update = function() {
  // This function, as written, creates no garbage and the compiler will inline everything
  // (no additional function calls)
  var v0 = mytype.tmpVec3_[0];
  goog.vec.Vec3.setFromValues(v0, 1, 2, 3);
  var v1 = mytype.tmpVec3_[1];
  goog.vec.Vec3.setFromValues(v1, 1, 2, 3);
  goog.vec.Vec3.add(v0, v1, this.someMember_);
};

/**
 * @private
 * @type {!Array.<!goog.vec.Vec3.Type>}
 */
mytype.tmpVec3_ = [goog.vec.Vec3.createFloat32(), goog.vec.Vec3.createFloat32()];
```

## Use types consistently with performance-critical functions

V8 (in Chrome/node.js) is particularly sensitive to polymorphic function calls. If possible, always call a function
with the same type, as doing otherwise will drastically degrade performance. The GF library ensures it calls
everything with only one type and always the most sensible one, it's good to ensure you do the same.

The most likely place for this to occur is with the goog.vec math library. All types expect to be working with
`Float32Array`, and if you use any other type (such as normal `Array` or `Int32Array`) you will force V8 to
regenerate the function with handling for both types. These functions are significantly slower and in performance
sensitive code can cause 2-10x slowdowns.

Unfortunately the types for the goog.vec functions are defined to accept a variety of types, so the compiler will not
be able to warn you about misuse. Be vigilant. It only takes one call to slow down the functions.

Example:

```javascript
  // Recommended type, fast call
  var realVec3 = goog.vec.Vec3.createFloat32FromValues(1, 2, 3);
  goog.vec.Vec3.normalize(realVec3, realVec3);
  // Non-recommended type, will cause performance drop across ALL CALLS, of ALL TYPES
  var fakeVec3 = [1, 2, 3];
  goog.vec.Vec3.normalize(fakeVec3, fakeVec3);
  // This call, exactly the same as the first, will now be significantly slower, and remain
  // slow for the rest of the app lifetime
  goog.vec.Vec3.normalize(realVec3, realVec3);
```

## Use goog.asserts for debugging

`goog.asserts.assert` is a handy function, performing runtime asserts when in uncompiled mode. When compiled, all
asserts will be removed leaving no size or performance impact.

`goog.asserts.assert` also has the nice property of signalling intent to the type system. For example, if you have a
value that is nullable after calling `goog.asserts.assert(value)` it will, to the type system, but non-null.

Asserts are recommended wherever possible, however it's important to note that too many in tight loops can make
uncompiled code run so slowly as to be unusble. If they are not required in an inner loop, avoid them.

## Avoid goog.asserts on the server

Asserts are great tools, however they are codified assumptions. When attempting to write robust server code the first
rule is to assume nothing. The clients on the other side of the socket may, intentionally or not, be sending things
that should never be possible under normal circumstances. If you use asserts in your server code it is then fairly easy
to construct denial-of-service attacks that simply do something you never expected.

NOTE: GF currently uses asserts everywhere in server code, but needs to not do so...

