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

utils.parseFirstName = obj => typeof(obj.firstName) === 'string' && obj.firstName.trim();
utils.parseLastName = obj => typeof(obj.lastName) === 'string' && obj.lastName.trim();
utils.parsePhone = obj => typeof(obj.phone) === 'string' && obj.phone.trim().length < 10 && obj.phone.trim();
utils.parseId = obj => typeof(obj.id) === 'string' && obj.id.trim().length === 20 && obj.id.trim();
utils.parsePassword = obj => typeof(obj.password) === 'string' && obj.password.trim();

//creates a string of alphanumeric characters, of a given length
utils.createRandomString = length => {
    if (typeof length !== 'number' || length !== length || length <= 0)
        return false;

    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let string = '';
    for (let i = 0; i < length; i++)
        string += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

    return string;
};

utils.getTokenExpire = () => {
    return Date.now() + 1000 * 60 * 60;
};

module.exports = utils;