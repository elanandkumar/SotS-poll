/**
 * Request handlers
 */
// Dependencies
const webRoutesHandler = require("./webRoutesHandler");
const members = require("./membersHandler");
const { tokens } = require("./tokensHandler");
const teams = require("./teamsHandler");
const votes = require("./votesHandler");
const helpers = require("./helpers");
// Define the handlers
const handlers = {
  members,
  tokens,
  teams,
  votes,
  ...webRoutesHandler
};

// Favicon
handlers.favicon = function(data, callback) {
  // Reject any request that isn't a GET
  if (data.method == "get") {
    // Read in the favicon's data
    helpers.getStaticAsset("favicon.ico", function(err, data) {
      if (!err && data) {
        callback(200, data, "favicon");
      } else {
        callback(500);
      }
    });
  } else {
    callback(405);
  }
};

// Public assets
handlers.public = function(data, callback) {
  // Reject any request that isn't a GET
  if (data.method == "get") {
    // get the filename being requested
    const trimmedAssetName = data.trimmedPath.replace("public/", "").trim();
    if (trimmedAssetName.length > 0) {
      // Read in the assets data
      helpers.getStaticAsset(trimmedAssetName, function(err, data) {
        if (!err && data) {
          // Determine the content type and default to plain text
          const contentType = helpers.getContentType(trimmedAssetName);
          // callback the data
          callback(200, data, contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }
  } else {
    callback(405);
  }
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;
