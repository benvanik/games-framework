@ECHO OFF

REM Copyright 2012 Google Inc. All Rights Reserved.
REM
REM Games Framework Windows setup script
REM
REM This script will install all dependencies to the system (that it can).
REM The dependencies are all global.
REM
REM Requires:
REM - Git 1.7.5+
REM - Python 2.7+
REM - Python easy_install:  http://pypi.python.org/pypi/setuptools
REM - node.js v0.6.10+ (containing npm)

REM TODO(benvanik): check python/node versions

ECHO.
REM ============================================================================
REM Closure linter
REM ============================================================================
ECHO Installing Closure linter...

easy_install http://closure-linter.googlecode.com/files/closure_linter-latest.tar.gz

ECHO.
REM ============================================================================
REM Python dependencies
REM ============================================================================
ECHO Installing Python packages...

FOR %%P IN (glob2 mako pil watchdog Autobahn sphinx unittest2 networkx coverage argparse mutagen) DO easy_install %%P

ECHO.
REM ============================================================================
REM Content tools
REM ============================================================================
ECHO Installing content tools...

REM TODO(benvanik): install tools (grab exes/etc?)
REM lame vorbis-tools pngcrush pngquant webp
ECHO TODO!

ECHO.
