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
 * @fileoverview Simple node.js externs. Only what I've used.
 * @externs
 */

/**
 * @param {string} name
 * @return {!Object}
 */
function require(name) {}


/**
 * @constructor
 * @param {number|string} sizeOrString
 * @param {string=} opt_encoding
 */
function Buffer(sizeOrString, opt_encoding) {}
/** @type {number} */
Buffer.prototype.length;



/** @constructor */
function EventEmitter() {}
/**
 * @param {string} event
 * @param {Function} listener
 */
EventEmitter.prototype.addListener = function(event, listener) {};
/**
 * @param {string} event
 * @param {Function} listener
 */
EventEmitter.prototype.removeListener = function(event, listener) {};
EventEmitter.prototype.removeAllListeners = function() {};



/** @constructor */
function Socket() {}
/**
 * @param {boolean} noDelay
 */
Socket.prototype.setNoDelay = function(noDelay) {};
/**
 * @param {boolean} enabled
 * @param {number=} opt_initialDelay
 */
Socket.prototype.setKeepAlive = function(enabled, opt_initialDelay) {};
/**
 * @param {number} timeout
 */
Socket.prototype.setTimeout = function(timeout) {};



/** @constructor */
function UrlModule() {}
/**
 * @param {string} urlStr
 * @param {boolean=} opt_parseQueryString
 * @param {boolean=} opt_slashesDenoteHost
 * @return {!Object}
 */
UrlModule.prototype.parse = function(
    urlStr, opt_parseQueryString, opt_slashesDenoteHost) {};



/** @constructor */
function HttpModule() {}
/**
 * @return {!Server}
 */
HttpModule.prototype.createServer = function() {};
/**
 * @param {!Object} options
 * @param {function(!ClientResponse)} callback
 * @return {!ClientRequest}
 */
HttpModule.prototype.request = function(options, callback) {};

/**
 * @constructor
 * @extends {EventEmitter}
 */
function ClientRequest() {}
/**
 * @param {number} timeout
 * @param {Function=} opt_callback
 */
ClientRequest.prototype.setTimeout = function(timeout, opt_callback) {};
/**
 * @param {?string|Buffer=} opt_data
 * @param {string=} opt_encoding
 */
ClientRequest.prototype.end = function(opt_data, opt_encoding) {};

/**
 * @constructor
 * @extends {EventEmitter}
 */
function ClientResponse() {}
/** @type {number} */
ClientResponse.prototype.statusCode;
/**
 * @param {string} encoding
 */
ClientResponse.prototype.setEncoding = function(encoding) {};


/**
 * @constructor
 * @extends {EventEmitter}
 */
function Server() {}
/**
 * @param {number} port
 * @param {string=} opt_hostname
 * @param {Function=} opt_callback
 */
Server.prototype.listen = function(port, opt_hostname, opt_callback) {};
Server.prototype.close = function() {};



/**
 * @constructor
 * @extends {EventEmitter}
 */
function ServerRequest() {}
/** @type {!Socket} */
ServerRequest.prototype.connection;


/**
 * @constructor
 * @extends {EventEmitter}
 */
function WritableStream() {}
/**
 * @param {!Buffer} data
 */
WritableStream.prototype.end = function(data) {};
WritableStream.prototype.destroySoon = function() {};



/** @constructor */
function FsStats() {}
/** @type {number} */
FsStats.prototype.size;
/** @type {Date} */
FsStats.prototype.atime;
/** @type {Date} */
FsStats.prototype.mtime;
/** @type {Date} */
FsStats.prototype.ctime;
/**
 * @return {boolean}
 */
FsStats.prototype.isFile = function() {};
/**
 * @return {boolean}
 */
FsStats.prototype.isDirectory = function() {};



/** @constructor */
function FsModule() {}
/**
 * @param {string} path
 * @param {(function(Object):void)=} opt_callback
 */
FsModule.prototype.mkdir = function(path, opt_callback) {};
/**
 * @param {string} path
 */
FsModule.prototype.mkdirSync = function(path) {};
/**
 * @param {string} path
 * @param {(function(Object):void)=} opt_callback
 */
FsModule.prototype.rmdir = function(path, opt_callback) {};
/**
 * @param {string} path
 */
FsModule.prototype.rmdirSync = function(path) {};
/**
 * @param {string} path
 * @param {(function(Object, Array.<string>):void)=} opt_callback
 */
FsModule.prototype.readdir = function(path, opt_callback) {};
/**
 * @param {string} path
 * @return {!Array.<string>}
 */
FsModule.prototype.readdirSync = function(path) {};
/**
 * @param {string} path
 * @param {(function(Object, FsStats):void)=} opt_callback
 */
FsModule.prototype.lstat = function(path, opt_callback) {};
/**
 * @param {string} path
 * @return {!FsStats}
 */
FsModule.prototype.lstatSync = function(path) {};
/**
 * @param {Object} fd
 * @return {!FsStats}
 */
FsModule.prototype.fstatSync = function(fd) {};
/**
 * @param {string} path
 * @return {boolean}
 */
FsModule.prototype.existsSync = function(path) {};
/**
 * @param {string} path
 * @param {(function(Object):void)=} opt_callback
 */
FsModule.prototype.unlink = function(path, opt_callback) {};
/**
 * @param {string} path
 */
FsModule.prototype.unlinkSync = function(path) {};
/**
 * @param {Object} fd
 * @param {number} len
 * @param {(function(Object):void)=} opt_callback
 */
FsModule.prototype.truncate = function(fd, len, opt_callback) {};
/**
 * @param {string} path
 * @param {(function(Object, Object):void)=} opt_callback
 */
FsModule.prototype.readFile = function(path, opt_callback) {};
/**
 * @param {string} path
 * @return {Buffer}
 */
FsModule.prototype.readFileSync = function(path) {};
/**
 * @param {string} path
 * @param {string|Buffer} data
 * @param {(function(Object):void)=} opt_callback
 */
FsModule.prototype.writeFile = function(path, data, opt_callback) {};
/**
 * @param {string} path
 * @param {string} flags
 * @param {number=} opt_mode
 * @param {(function(Object, Object):void)=} opt_callback
 */
FsModule.prototype.open = function(path, flags, opt_mode, opt_callback) {};
/**
 * @param {Object} fd
 * @param {(function(Object):void)=} opt_callback
 */
FsModule.prototype.close = function(fd, opt_callback) {};
/**
 * @param {Object} fd
 */
FsModule.prototype.closeSync = function(fd) {};
/**
 * @param {Object} fd
 * @param {!Buffer} buffer
 * @param {number} offset
 * @param {number} length
 * @param {number?} position
 * @param {(function(Object, number, Buffer):void)=} opt_callback
 */
FsModule.prototype.read = function(fd, buffer, offset, length, position,
    opt_callback) {};
/**
 * @param {Object} fd
 * @param {!Buffer} buffer
 * @param {number} offset
 * @param {number} length
 * @param {number?} position
 * @param {(function(Object, number, Buffer):void)=} opt_callback
 */
FsModule.prototype.write = function(fd, buffer, offset, length, position,
    opt_callback) {};
/**
 * @param {string} path
 * @param {{
 *   flags: (string|undefined),
 *   encoding: (string|undefined),
 *   mode: (number|undefined)
 * }=} opt_options
 * @return {!WritableStream}
 */
FsModule.prototype.createWriteStream = function(path, opt_options) {};


/** @constructor */
function PathModule() {}
/**
 * @param {string} a
 * @param {string} b
 * @return {string}
 */
PathModule.prototype.join = function(a, b) {};
/**
 * @param {string} path
 * @return {string}
 */
PathModule.prototype.dirname = function(path) {};
/**
 * @param {string} path
 * @param {string=} opt_ext
 * @return {string}
 */
PathModule.prototype.basename = function(path, opt_ext) {};


/** @constructor */
function ProcessModule() {}
/**
 * @param {number=} opt_code
 */
ProcessModule.prototype.exit = function(opt_code) {};
/**
 * @param {string} name
 * @param {Function} callback
 */
ProcessModule.prototype.on = function(name, callback) {};
/**
 * @param {Function} callback
 */
ProcessModule.prototype.nextTick = function(callback) {};
/** @type {!ProcessModule} */
var process;



// TODO(benvanik): move elsewhere
/**
 * @constructor
 * @extends {EventEmitter}
 * @param {Object} request
 * @param {Object} socket
 * @param {Object} head
 */
function FayeWebSocket(request, socket, head) {}
/** @type {Function} */
FayeWebSocket.prototype.onmessage;
/** @type {Function} */
FayeWebSocket.prototype.onclose;
/**
 * @param {Buffer|string} data
 */
FayeWebSocket.prototype.send = function(data) {};
FayeWebSocket.prototype.close = function() {};


// TODO(benvanik): move elsewhere
/**
 * @constructor
 * @extends {EventEmitter}
 * @param {{
 *     host: ?string,
 *     port: number
 * }} options
 */
function WsWebSocketServer(options) {}
WsWebSocketServer.prototype.close = function() {};
/**
 * @constructor
 * @extends {EventEmitter}
 */
function WsWebSocket() {}
/**
 * @param {!Buffer|string} data
 * @param {{
 *     binary: (boolean|undefined),
 *     mask: (boolean|undefined)}=
 * } opt_options
 */
WsWebSocket.prototype.send = function(data, opt_options) {};
/**
 * @param {number} code
 * @param {Buffer|string} data
 */
WsWebSocket.prototype.close = function(code, data) {};
