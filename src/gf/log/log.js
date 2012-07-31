/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Logging utilities that function in browser, Workers and node.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

goog.provide('gf.log');


/**
 * Installs a log message listener on a port.
 * @param {!MessagePort|!Worker|!SharedWorker} port Port to install on.
 * @param {string} prefix Prefix for messages.
 */
gf.log.installListener = function(port, prefix) {
  port.addEventListener('message', function(e) {
    if (e.data instanceof Object) {
      if (e.data['type'] == 'gf_log') {
        var args = e.data['args'];
        args.unshift(prefix);
        window.console.log.apply(window.console, args);
        e.stopPropagation();
      }
    }
  }, true);
};


/**
 * HACK: sets a global port that receives log events.
 * @type {!Array.<!MessagePort>}
 */
gf.log.activePorts = goog.global.postMessage ? [goog.global] : [];


/**
 * Logs a list of values to the current logger.
 * @param {...} var_args Values to log.
 */
gf.log.write = function(var_args) {
  // TODO(benvanik): something?
  // TODO(benvanik): support for web worker plumbing (relay messages to main
  //     thread for display there)
  // TODO(benvanik): option for forking log messages from server to admin
  //     clients to aid debugging
  for (var n = 0; n < gf.log.activePorts.length; n++) {
    var args = new Array(arguments.length);
    for (var m = 0; m < args.length; m++) {
      args[m] = arguments[m];
    }
    try {
      gf.log.activePorts[n].postMessage({
        'type': 'gf_log',
        'args': args
      }, null);
    } catch (e) {
      // Not much we can do...
    }
  }
};


// If there is a native console object, use that instead of our wrapper.
// This enables proper line tracing in the console.
if (goog.global['console']) {
  var console = goog.global['console'];
  gf.log.write = goog.bind(console.log, console);
}


/**
 * Logs a list of values to the current logger.
 * @param {...} var_args Values to log.
 */
gf.log.debug = goog.DEBUG ? gf.log.write : goog.nullFunction;
