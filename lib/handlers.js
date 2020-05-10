'use strict';
/*
 * Request Handlers
 */

 // Dependencies
const _data = require('./data');
const utils = require('./utils');

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
    const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim();
    const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim();
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length < 10 && data.payload.phone.trim();
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim();
    const tosAgreement = data.payload.tosAgreement === true;

    if (!firstName || !lastName || !phone || !password || !tosAgreement)
        return callback(400,'Missing required fields or invalid inputs.');

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
// TODO: Only let an authed user acces their object, dont let them access any1 elses
handlers._users.get = (data, callback) => {
    // validate phone number
    const phone = typeof(data.queryParams.phone) === 'string' && data.queryParams.phone.trim().length < 10 && data.queryParams.phone.trim();

    if (!phone)
        return callback(400, 'Missing required field.');

    _data.read('users', phone, (err, data) => {
        if (!err && data) {
            // Remove hashed password from user data before returning response
            delete data.hashedPassword;
            callback(200, data);
        }
        else
            callback(404);
    });
};

// required data: phone
// optional data: firstName, lastName, password (at least one must be specified)
// TODO: Only let an authed user update their object, dont let them update any1 elses
handlers._users.put = (data, callback) => {
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length < 10 && data.payload.phone.trim();

    if (!phone)
        return callback(400, {'Error': 'missing required field'});

    // Check optional fields
    const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim();
    const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim();
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim();

    if (!firstName && !lastName && !password)
        return callback(400, {'Error': 'missing optional field(s) to update'});

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
};

// required data: phone
// optional data: none
// TODO: Only let an authed user delete their object, dont let them delete any1 elses
// TODO: Clean up associated files with this user
handlers._users.delete = (data, callback) => {
      // validate phone number
      const phone = typeof(data.queryParams.phone) === 'string' && data.queryParams.phone.trim().length < 10 && data.queryParams.phone.trim();

      if (!phone)
          return callback(400, 'Missing required field.');

      _data.read('users', phone, (err, data) => {
          if (!err && data) {
              _data.delete('users', phone, (err) => {
                  if (!err)
                      callback(200);
                  else
                    callback(500, {'Error': 'Could not delete the specified user'});

              });
          }
          else
              callback(400, {'Error': 'Could not find the specified user'});
      });
};

module.exports = handlers;