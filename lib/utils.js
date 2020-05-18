'use strict';
/*
* Utilitary functions for various tasks
*/

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');

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
utils.parseProtocol = obj => typeof(obj.protocol) === 'string' && (obj.protocol === 'http' || obj.protocol === 'https') && obj.protocol;
utils.parseUrl = obj => typeof(obj.url) === 'string' && obj.url.trim().length > 0 && obj.url.trim();
utils.parseMethod = obj => typeof(obj.method) === 'string' && (obj.method === 'post' || obj.method === 'get' || obj.method === 'put' || obj.method === 'delete') && obj.method;
utils.parseSuccessCodes = obj => obj.successCodes instanceof Array && obj.successCodes.length > 0 && obj.successCodes;
utils.parseTimeoutSeconds = obj => typeof(obj.timeoutSeconds) === 'number' && obj.timeoutSeconds % 1 === 0 && obj.timeoutSeconds > 0 && obj.timeoutSeconds < 6 && obj.timeoutSeconds;

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

// Send an sms via twilio
utils.sendTwilioSms = (phone, message, callback) => {
    // validate the parameters
    phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false;
    message = typeof message === 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;

    if (!phone || !message)
        return callback('Given parameters were missing or invalid');

    const payload = {
        From: config.twilio.fromPhone,
        To: '+1' + phone,
        Body: message
    };

    const stringPayload = querystring.stringify(payload);

    // Configure the request details
    const requestDetails = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
        auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
        headers: {
            'Content-Type':'application/x-www-form-urlencoded',
            'Content-Length':Buffer.byteLength(stringPayload)
        }
    };

    // Instantiate the request object
    const request =  https.request(requestDetails, response => {
        if (response.statusCode === 200 || response.statusCode === 201)
            return callback(false);

        callback(`Status code returned was ${response.statusCode}`);
    });

    // bind to the error event so it doesnt get stop the thread?
    request.on('error', e => {
        callback(e);
    });

    // add the payload
    request.write(stringPayload);

    // End the request
    request.end();
};

module.exports = utils;