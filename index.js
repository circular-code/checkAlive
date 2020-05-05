/*
* Primary file for the API
*/

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');

const unifiedServer = (request, response) => {

    // get url and parse it
    const parsedUrl = url.parse(request.url, true);

    // get path from url
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // get the query string as an object
    const queryParams = parsedUrl.query;

    // get http method
    const method = request.method.toLowerCase();

    // get the headers as an object
    const headers = request.headers;

    // get the payload, if any was sent
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    request
    .on('data', (data) => {
        buffer += decoder.write(data);
    })
    .on('error', (error) => {
        console.log(error);
    })
    .on('end', (payload) => {
        buffer += decoder.end();

        // choose the handler this request should go to, if none is found use the notFound handler
        const handler = handlers[trimmedPath] || handlers.notFound;

        // construct data to send to handler
        const data = {
            trimmedPath,
            queryParams,
            method,
            headers,
            payload
        };

        //route the request to the handler specified in the router
        handler(data, (statusCode, payload) => {

            if (typeof statusCode !== 'number')
                statusCode = 200;

            if (!payload)
                payload = {};

            const payloadString = JSON.stringify(payload);

            //set headers before writing response
            response.setHeader('Content-Type', 'application/json');

            // send the response
           response.writeHead(statusCode);
           response.end(payloadString);

           // log the path the person was asking for
            console.log('returning this response ', statusCode, payloadString);
        });
    });

    // console.log(request);
};

//instantiate servers
const httpServer = http.createServer(unifiedServer);

const httpsServerOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./certificate.pem')
};

const httpsServer = https.createServer(httpsServerOptions, unifiedServer);

//start the servers and have it listen on port from config
httpServer.listen(config.httpPort, () => {
    console.log('Http Server ist listening on port ' + config.httpPort);
});

httpsServer.listen(config.httpsPort, () => {
    console.log('Https Server ist listening on port ' + config.httpsPort);
});

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