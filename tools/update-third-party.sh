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
# node_modules
# =============================================================================
echo "Updating node modules..."

# TODO(benvanik): update each module

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

# =============================================================================
# Closure Compiler
# =============================================================================
echo "Grabbing latest Closure Compiler..."

# TODO(benvanik): compile from source
cd third_party
cd closure-compiler
wget -nv http://closure-compiler.googlecode.com/files/compiler-latest.zip
unzip -o -q compiler-latest.zip
rm compiler-latest.zip
cd ..
cd ..

echo ""
# =============================================================================
# Closure Templates
# =============================================================================
echo "Updating to the latest Closure Templates..."

# TODO(benvanik): compile from source
cd third_party
cd closure-templates
wget -nv http://closure-templates.googlecode.com/files/closure-templates-for-javascript-latest.zip
unzip -o -q closure-templates-for-javascript-latest.zip
rm closure-templates-for-javascript-latest.zip
cd ..
cd ..

echo ""
# =============================================================================
# Closure Stylesheets
# =============================================================================
echo "Updating to the latest Closure Stylesheets..."

# TODO(benvanik): closure-stylesheets (need -latest)
# TODO(benvanik): compile from source
echo "WARNING: closure-stylesheets doesn't have a -latest, manually check:"
echo "http://code.google.com/p/closure-stylesheets/"

echo ""
