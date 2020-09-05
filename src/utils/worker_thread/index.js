'use strict';

// Use --experimental-worker will need Nodejs v10.5.0 until 11.7
const {builtinModules} = require('module');
// eslint-disable-next-line node/no-unsupported-features/node-builtins
module.exports = builtinModules.includes('worker_threads') ? require('worker_threads').Worker : false;
