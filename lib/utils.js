'use strict';
/*
* Utilitary functions for various tasks
*/

// Dependencies
var crypto = require('crypto');
var config = require('./config');

var utils = {};

// Create a SHA256 Hash
utils.hash = (str) => {
    if (typeof(str) !== 'string' || !str)
        return;

    return crypto.createHmac('sha256', config.secret).update(str).digest('hex');
};

// Parse a JSON string to an object in all cases without throwing
utils.parseJsonToObject = (str) => {
    try {
        return JSON.parse(str);
    }
    catch {
        return {};
    }
};

module.exports = utils;