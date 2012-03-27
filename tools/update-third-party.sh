#!/bin/bash

# Copyright 2012 Google Inc. All Rights Reserved.

# This script is only to be used by contributors.
# It will attempt to pull the latest versions of third party code and binaries.
# Before running one should be in a git branch with no pending changes.

# This must currently run from the root of the repo
# TODO(benvanik): make this runnable from anywhere (find git directory?)
if [ ! -d ".git" ]; then
  echo "This script must be run from the root of the repository (the folder containing .git)"
  exit 1
fi

# =============================================================================
# Closure Compiler
# =============================================================================
echo "Grabbing latest Closure Compiler..."

# The compiler guys put a new binary up every once in awhile - this simply
# grabs the latest one they have and extracts it
# In the future we may want to compile our own jar file from source (if we
# want a newer version than the one that goes up every few months)
# Note that git is smart and it's fine if this is a no-op
cd third_party
cd closure-compiler
wget -nv http://closure-compiler.googlecode.com/files/compiler-latest.zip
unzip -o -q compiler-latest.zip
rm compiler-latest.zip
cd ..
cd ..

echo ""
# =============================================================================
# Closure Library
# =============================================================================
echo "Updating to the latest Closure Library..."

cd third_party
cd closure-library
git checkout master
git pull origin master
cd ..
cd ..
git add third_party/closure-library

echo ""
# =============================================================================
# Closure Stylesheets
# =============================================================================
echo "Updating to the latest Closure Stylesheets..."

# TODO(benvanik): closure-stylesheets (need -latest)
echo "WARNING: closure-stylesheets doesn't have a -latest, manually check:"
echo "http://code.google.com/p/closure-stylesheets/"

echo ""
# =============================================================================
# node_modules
# =============================================================================
echo "Updating node modules..."

# Note that we just assume npm exists and is valid
# Calling like this should (since we are in our root) just update the npm
# modules under the local node_modules folder
npm update

echo ""
