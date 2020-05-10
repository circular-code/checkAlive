'use strict';
/*
* Library for storing and editing data
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

// Container for the module (to be exported)
const lib = {};

lib.baseDir = path.join(__dirname, '/../data/');

// write data to a file
lib.create = (dir, file, data, callback) => {

    //Open the file for writing
    fs.open(lib.baseDir + dir + '\\' + file + '.json', 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            //Convert data to string
            var stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err)
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        }
                        else {
                            callback('Error closing new file');
                        }
                    });
                else {
                    callback('Error writing to new file');
                }
            });
        }
        else {
            callback('Could not create new file, it may already exist.');
        }
    });
};

lib.read = (dir, file, callback) => {
    fs.readFile(lib.baseDir + dir + '\\' + file + '.json', 'utf8', (err, data) => {
        if (!err && data)
            callback(false, utils.parseJsonToObject(data));
        else
            callback(err, data);
    });
};

// callback christmastree of doom

lib.update = (dir, file, data, callback) => {
    // Open the file for writing
    fs.open(lib.baseDir + dir + '\\' + file + '.json', 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert Data to String
            const stringData = JSON.stringify(data);

            // Truncate the file
            fs.truncate(fileDescriptor, (err) => {
                if (!err) {
                    //write to file and close it
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err)
                                    callback(false);
                                else
                                    callback('Error closing file');
                            });
                        }
                        else
                            callback('Error writing to existing file.');
                    });
                }
                else {
                    console.log('Error truncating file.');
                }
            });
        }
        else {
            console.log('Could not open the file for updating, it may not exist yet.');
        }
    });
};

lib.delete = (dir, file, callback) => {
    // Unlink the file
    fs.unlink(lib.baseDir + dir + '\\' + file + '.json', (err) => {
        if (!err) {
            callback(false);
        }
        else
            callback('Error deleting file');
    });
};

//Export the module
module.exports = lib;