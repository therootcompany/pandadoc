'use strict';

Object.assign(module.exports, require('./hmac.js'));
module.exports.middleware = require('./express.js');
module.exports.request = require('./request.js');
