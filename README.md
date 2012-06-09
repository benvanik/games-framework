GF - low-level web games framework and content pipeline
========================================================================================================================
- - -

GF is a modularized Javascript library that is built atop [Google Closure](http://code.google.com/closure/), using the
[Closure Library](http://code.google.com/closure/library/) as a base and the
[Closure Compiler](http://code.google.com/closure/compiler/) to build the tiny and fast output Javascript files.
Designed to be a set of tools to enable rapid high-quality games, it's not an engine (like Unity) or scene graph
(like three.js), but more akin to XNA or SDL. Pick what you need, get started quickly, and spend timing writing game
code vs. platform abstractions and content pipelines.

For detailed information about the framework and its classes, see `docs/`.

# Game Library Features

* Runtime
  * Robust game loop management
  * Idle state/hidden tab tracking
* Audio
  * 3D positional sound via [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html)
  * Efficient sound bank representation (single file transfer) + tools for creation
  * Efficient music playback
  * (coming soon) fallback for <audio> tag
* Graphics
  * Display supporting orientation changes, fullscreen mode, etc
  * WebGL context loss/restore handling
  * Texture atlases and sprite batch rendering
  * WebGL shader program abstraction
  * Bitmap fonts with kerning and layout
* Input
  * Mouse Lock support
  * (coming soon) on-screen dpad and accelerometer
  * (coming soon) gamepad support
  * (coming soon) input action map/normalization
* Multiplayer Networking
  * Client/server session management
  * Synchronized clocks
  * Localhost server via Web Workers
  * SharedWorker for multi-tab local networking
  * node.js server via WebSockets (100% shared code)
  * Efficient network binary representation
  * (coming soon) authentication via ID providers (G+/Facebook/etc)
* Math and Utilities
  * Axis-aligned bounding box
  * Octree
  * Quaternion, ray, vec enhancements
  * Seedable PRNG
  * Viewport (ray casting, frustum culling, etc)
* Content Pipeline
  * Integration with [anvil-build](https://github.com/benvanik/anvil-build)
  * Efficiently build Javascript and assets
  * Many built-in game-specific tasks
  * Supports a daemon mode for doing live content updates

# Setup

Setup is largely automated via `setup.sh` or `setup.bat` (depending on platform).
For instructions see [setup](https://github.com/benvanik/games-framework/blob/master/docs/setup.md).

# Project Tutorial

For more information about getting started, check out
[getting_started](https://github.com/benvanik/games-framework/blob/master/docs/getting_started.md).

# Disclaimer

This project should be considered alpha - it is likely to have significant changes and additions, and should not be
considered stable yet. Use at your own risk.

# Raison d'etre

The web is an awesome platform for games however there have been very few attempts at creating a good development flow
for building them. It's trivial to build a simple mash-up prototype, but there is a lack of focus around good
engineering. The goal of this project, as well as [anvil-build](https://github.com/benvanik/anvil-build), is to bring
some of the good things about other development environments over to the web while also recognizing and respecting what
makes web development so much fun.

## Your own build system!?

[anvil-build](https://github.com/benvanik/anvil-build) arose from the need to have a solid content pipeline and build
system that was web-aware and not being able to find any that fit the bill. It's modelled after the build system used
internally at Google and provides many things not possible with others. It's in its early stages and is the second
revision of the build system I originally designed for this project - the benefits of it cannot be overstated and I
hope to demonstrate them soon.

## Why Closure?

* Closure Compiler generates some of the smallest Javascript out there
* Native Javascript - no plugins or extensions required to get the functionality
* Compiler inlining can drastically help performance (and can only get better)
* Closure Library contains a lot of useful functionality
  * Localization/i18n
  * Array, object, and string extensions
  * Data structures
  * DOM/CSS/etc templating and abstractions
  * Rich and efficient vector math library (one of the fastest!)
  * Well tested and maintained

## What about three.js and other awesome libraries?

The goal of GF is to build large, scalable, maintainable Javascript Games. It focuses on providing blocks upon which to
build complex logic while imposing very little of its own. It's not a rapid prototying solution, and the minimum amount
of work required to get something going is much higher than the elegantly simple three.js, but where it shines is on
larger, longer-lived projects.

# License

All code except dependencies under third_party/ is licensed under the permissive Apache 2.0 license.
Feel free to fork/rip/etc and use as you wish!

# Contributing

Have a fix or feature? Submit a pull request - I love them!
Note that I do keep to the [style_guide](https://github.com/benvanik/games-framework/blob/master/docs/style_guide.md),
so please check it out first!

As this is a Google project, you *must* first e-sign the
[Google Contributor License Agreement](http://code.google.com/legal/individual-cla-v1.0.html) before I can accept any
code. It takes only a second and basically just says you won't sue us or claim copyright of your submitted code.
