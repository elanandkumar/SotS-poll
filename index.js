/*
 * Primary file for the API
 */

// Dependencies
const server = require("./lib/server");

const app = {};

// Init function
app.init = function() {
  server.init();
};

// Execute
app.init();

// Export the app
module.exports = app;
