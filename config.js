/*
 * Create and export configuration variables
 * SET ENV Variables with  $env:NODE_ENV="production" on windows or NODE_ENV=production (or staging)
 */

// Container for all the environments
var  environments = {};

// Staging (default) environment
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging'
};

// Production environment
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production'
};

// Determine wich environment was passed as cli argument
const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not, default to staging and export the module
module.exports = environments[currentEnvironment] || environments.staging;