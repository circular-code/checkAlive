'use strict';
/*
 * Request Handlers
 */

 // Dependencies
const _data = require('./data');
const utils = require('./utils');
const config = require('./config');

const handlers = {};

handlers.getRequestData = (data, callback) => {
    //callback a http status code, and a payload object
    callback(406, data);
};

handlers.notFound = (data, callback) => {
    callback(404);
};

handlers.ping = (data, callback) => {
    callback();
};

handlers.users = (data, callback) => {
    const validMethods = ['post', 'get', 'put', 'delete'];
    if (validMethods.indexOf(data.method) > -1)
        handlers._users[data.method](data, callback);
    else
        callback(405);
};

handlers._users = {};

// required data: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._users.post = (data, callback) => {
    // check that all required fields are filled out
    const firstName = utils.parseFirstName(data.payload);
    const lastName = utils.parseLastName(data.payload);
    const phone = utils.parsePhone(data.payload);
    const password = utils.parsePassword(data.payload);
    const tosAgreement = data.payload.tosAgreement === true;

    if (!firstName || !lastName || !phone || !password || !tosAgreement)
        return callback(400,'Missing required fields or inputs are invalid.');

    // Make sure that the user doesnt already exist
    _data.read('users', phone, (err, data) => {
        if (!err)
            return callback(400, 'User already exists');

        // hash the password
        const hashedPassword = utils.hash(password);

        if (!hashedPassword)
            return callback(500, {Error: 'Could not hash password'});

        // create the user object
        const userObj = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement,
        }

        _data.create('users', phone, userObj, (err) => {
            if (!err)
                return callback(200);

            console.log(err);
            callback(500, {Error: 'Could not create the new user'});
        });
    });
};

// required data: phone
// optional data: none
handlers._users.get = (data, callback) => {
    // validate phone number
    const phone = utils.parsePhone(data.queryParams);
    if (!phone)
        return callback(400, 'Missing required field.');

    // Get token from headers
    const token = typeof data.headers.token === 'string' && data.headers.token;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, isValid => {

        if (!isValid)
            return callback(403, {Error: 'Missing required token in headers, or token is invalid'});

        _data.read('users', phone, (err, data) => {
            if (!err && data) {
                // Remove hashed password from user data before returning response
                delete data.hashedPassword;
                callback(200, data);
            }
            else
                callback(404);
        });
    });
};

// required data: phone
// optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
    const phone = utils.parsePhone(data.payload);

    if (!phone)
        return callback(400, {'Error': 'missing required field'});

    // Check optional fields
    const firstName = utils.parseFirstName(data);
    const lastName = utils.parseLastName(data);
    const password = utils.parsePassword(data);

    if (!firstName && !lastName && !password)
        return callback(400, {'Error': 'missing optional field(s) to update'});

    // Get token from headers
    const token = typeof data.headers.token === 'string' && data.headers.token;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, isValid => {

        if (!isValid)
            return callback(403, {Error: 'Missing required token in headers, or token is invalid'});

        // Lookup the user
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                // update nececcary fields
                if (firstName)
                    userData.firstName = firstName;

                if (lastName)
                    userData.lastName = lastName;

                if (password)
                    userData.hashedPassword = utils.hash(password);

                // store the updates
                _data.update('users', phone, userData, (err) => {
                    if (err) {
                        console.log(err);
                        return callback(500, 'Could not update the user.');
                    }
                    else
                        callback(200);
                })
            }
            else
                callback(400, {'Error': 'specified user does not exist.'});
        });
    });
};

// required data: phone
// optional data: none
handlers._users.delete = (data, callback) => {
    const phone = utils.parsePhone(data.queryParams);

    if (!phone)
          return callback(400, 'Missing required field.');

    // Get token from headers
    const token = typeof data.headers.token === 'string' && data.headers.token;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, isValid => {

        if (!isValid)
            return callback(403, {Error: 'Missing required token in headers, or token is invalid'});

        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                _data.delete('users', phone, err => {
                    if (err)
                        return callback(500, {'Error': 'Could not delete the specified user'});

                    // Delete each of the checks associated with the user
                    const userChecks = userData.checks instanceof Array ? userData.checks : [];

                    if (userChecks.length === 0)
                        return callback(200);

                    let checksDeleted = 0;
                    let deletionErrors = false;

                    // Loop through the checks
                    userChecks.forEach(checkId => {
                        _data.delete('checks', checkId, err => {

                            if (err)
                                deletionErrors = true;

                            checksDeleted++;

                            if (checksDeleted === userChecks.length)
                                if (!deletionErrors)
                                    callback(200);
                                else
                                    callback(500, {Error: 'Errors encountered while attempting to delete all of the users checks. All checks may not habe been deleted from the system successfully.'})
                        });
                    });

                    // Remove the deleted check from the list of checks
                    // const checkPosition = userChecks.indexOf(id);

                    // if (checkPosition === -1)
                    //     callback(500, {Error: 'Could not find the check on the users object, so could not remove it.'});
                });
            }
            else
                callback(404, {'Error': 'Could not find the specified user'});
        });
    });
};

handlers.tokens = (data, callback) => {
    const validMethods = ['post', 'get', 'put', 'delete'];
    if (validMethods.indexOf(data.method) > -1)
        handlers._tokens[data.method](data, callback);
    else
        callback(405);
};

handlers._tokens = {};

// required data: phone, password
// optional data: none
handlers._tokens.post = (data, callback) => {
    const phone = utils.parsePhone(data.payload);
    const password = utils.parsePassword(data.payload);

    if (!phone || !password)
        return callback(400, {'Error': 'missing required field(s)'});

    _data.read('users', phone, (err, userData) => {
        if (err || !userData)
            return callback(404, {'Error': 'Could not find the specified user'});

        // hash the sent password and compare it to the password stores in the user
        const hashedPassword = utils.hash(password);

        if (hashedPassword !== userData.hashedPassword)
            return callback(400, {'Error': 'Password did not match the specified users stored password.'});

        const id = utils.createRandomString(20);
        const expires = utils.getTokenExpire();
        const tokenObject = {
            phone,
            id,
            expires
        };

        _data.create('tokens', id, tokenObject, (err) => {
            if (err)
                return callback(500, {Error: 'Could not create the new token.'});

            callback(200, tokenObject);
        });
    });
};

// required data: id
// optional data: none
handlers._tokens.get = (data, callback) => {
    const id = utils.parseId(data.queryParams);

    if (!id)
        return callback(400, 'Missing required field.');

    _data.read('tokens', id, (err, data) => {

        if (err || !data)
            return callback(404, {'Error': 'Could not find the specified token'});

        callback(200, data);
    });
};

// required data: id, extend
// optional data: none
handlers._tokens.put = (data, callback) => {
    const id = utils.parseId(data.payload);
    const extend = data.payload.extend === true;

    if (!id || !extend)
        return callback(400, {Error: 'Missing required fields.'});

    _data.read('tokens', id, (err, data) => {
        if (err || !data)
            return callback(404, {Error: 'Could not find the specified token'});

        if (data.expires < Date.now())
            return callback(400, {Error: 'The token has already expired, and cannot be extended'});

        data.expires = utils.getTokenExpire();

        _data.update('tokens', id, data, err => {
            if (err)
                return callback(500, {Error: 'Could not update the tokens expiration.'})

            callback(200);
        });
    });
};

// required data: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._tokens.delete = (data, callback) => {
    const id = utils.parseId(data.queryParams);

    if (!id)
        return callback(400, 'Missing required field.');

    _data.read('tokens', id, (err, data) => {
        if (!err && data) {
            _data.delete('tokens', id, (err) => {
                if (err)
                    return callback(500, {'Error': 'Could not delete the specified token'});

                callback(200);
            });
        }
        else
            callback(404, {'Error': 'Could not find the specified token'});
    });
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    //Lookup the token
    _data.read('tokens', id, (err, data) => {
        if (err || !data)
            return callback(false);

        callback(data.phone === phone && data.expires > Date.now());
    });
};

handlers.checks = (data, callback) => {
    const validMethods = ['post', 'get', 'put', 'delete'];
    if (validMethods.indexOf(data.method) > -1)
        handlers._checks[data.method](data, callback);
    else
        callback(405);
};

handlers._checks = {};

// required data: protocol, url, method, successCodes, responseTime
// optional data: none
handlers._checks.post = (data, callback) => {
    const protocol = utils.parseProtocol(data.payload);
    const url = utils.parseUrl(data.payload);
    const method = utils.parseMethod(data.payload);
    const successCodes = utils.parseSuccessCodes(data.payload);
    const timeoutSeconds = utils.parseTimeoutSeconds(data.payload);

    if(!protocol || !url || !method || !successCodes || !timeoutSeconds)
        return callback(400,'Missing required fields or inputs are invalid.');

    // Get token from headers
    const token = typeof data.headers.token === 'string' && data.headers.token;

    _data.read('tokens', token, (err, tokenData) => {
        if (err || !tokenData)
            return callback(403);

        const userPhone = tokenData.phone;

        _data.read('users', userPhone, (err, userData) => {
            if (err || !userData)
                return callback(403);

            const userChecks = userData.checks instanceof Array ? userData.checks : [];

            // Verify that the user has less than the number of max amount of checks per user

            if (userChecks.length >= config.maxChecks)
                return callback(400, {Error: `The user already has the maximum number of checks (${config.maxChecks}).`});

            // Create a random id for the check
            const id = utils.createRandomString(20);

            const checkObj = {
                id,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
            };

            _data.create('checks', id, checkObj, err => {
                if (err)
                    return callback(500, {Error: 'Could not create the new check.'});

                // Add the checkId to the users Object
                userChecks.push(id);
                userData.checks = userChecks;

                //save the new user data

                _data.update('users', userPhone, userData, err => {
                    if (err)
                        return callback(500, {Error: 'Could not update the user with the new check.'});

                    callback(200, checkObj);
                });
            });
        });
    })
};

// required data: id
// optional data: none
handlers._checks.get = (data, callback) => {

    const id = utils.parseId(data.queryParams);
    if (!id)
        return callback(400, 'Missing required field.');

    _data.read('checks', id, (err, checkData) => {

        if (err || !checkData)
            callback(404);

        // Get token from headers
        const token = typeof data.headers.token === 'string' && data.headers.token;

        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, isValid => {

            if (!isValid)
                return callback(403);

            callback(200, checkData);
        });
    });
};

// required data: id, at least one of optional
// optional data: protocol, url, method, successCode, timeoutSeconds
handlers._checks.put = (data, callback) => {
    const id = utils.parseId(data.payload);
    const protocol = utils.parseProtocol(data.payload);
    const url = utils.parseUrl(data.payload);
    const method = utils.parseMethod(data.payload);
    const successCodes = utils.parseSuccessCodes(data.payload);
    const timeoutSeconds = utils.parseTimeoutSeconds(data.payload);

    if (!id)
        return callback(400, {Error: 'Missing required field.'});

    if (!protocol && !url && !method && !successCodes && !timeoutSeconds)
        return callback(400, {Error: 'Missing fields to update.'});

    _data.read('checks', id, (err, checkData) => {
        if (err || !checkData)
            return callback(400, {Error: 'Check id did not exists'});

        // Get token from headers
        const token = typeof data.headers.token === 'string' && data.headers.token;

        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, isValid => {
            if (!isValid)
                return callback(403);

            //update the check where necessary
            if (protocol)
                checkData.protocol = protocol;

            if (url)
                checkData.url = url;

            if (method)
                checkData.method = method;

            if (successCodes)
                checkData.successCodes = successCodes;

            if (timeoutSeconds)
                checkData.timeoutSeconds = timeoutSeconds;

            // store the updates
            _data.update('checks', id, checkData, err => {
                if (err)
                    return callback(500, {Error: 'Could not update the check'});

                callback(200);
            });
        });
    });
};

// required data: id
// optional data: none
handlers._checks.delete = (data, callback) => {
    const id = utils.parseId(data.queryParams);

    if (!id)
        return callback(400, 'Missing required field.');

    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
        if (err || !checkData)
            return callback(400, {Error: 'The specified checkId does not exist.'})

        // Get token from headers
        const token = typeof data.headers.token === 'string' && data.headers.token;

        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, checkData.userPhone, isValid => {

            if (!isValid)
                return callback(403, {Error: 'Missing required token in headers, or token is invalid'});

            _data.delete('checks', id, err => {
                if (err)
                    return callback(500, {Error: 'Could not delete the check data.'})

                _data.read('users', checkData.userPhone, (err, userData) => {
                    if (err || !userData)
                        return callback(500, {'Error': 'Could not find the user who created the check, could not remove the check from the list of checks on the user object.'});

                    const userChecks = userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted check from the list of checks
                    const checkPosition = userChecks.indexOf(id);

                    if (checkPosition === -1)
                        callback(500, {Error: 'Could not find the check on the users object, so could not remove it.'});

                    userChecks.splice(checkPosition, 1);

                    _data.update('users', checkData.userPhone, userData, err => {
                        if (err)
                            return callback(500, {'Error': 'Could not update the specified user'});

                        callback(200);
                    });
                });
            });
        });
    });
};

module.exports = handlers;