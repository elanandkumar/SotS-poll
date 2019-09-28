// Votes handler
const _data = require("./data");
const helpers = require("./helpers");
const { _tokens } = require("./tokensHandler");

// Teams handler
const teams = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _teams[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Containers for the teams submethods
const _teams = {};
// Teams - post
// Required data: name, password
// Optional data: none
_teams.post = (data, callback) => {
  // Check that all required fields are filled out
  const { payload } = data;

  // data validation...
  const name =
    typeof payload.name == "string" && payload.name.trim().length > 0
      ? payload.name.trim()
      : false;
  const password =
    typeof payload.password == "string" && payload.password.trim().length > 0
      ? payload.password.trim()
      : false;

  if (name && password) {
    // Make sure that the team doesn't already exists.
    _data.read("teams", name, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);
        // Create the team object
        if (hashedPassword) {
          const teamObject = {
            name,
            hashedPassword
          };

          // Store the team
          _data.create("teams", name, teamObject, err => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: "Could not create the new team!" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash the team's password." });
        }
      } else {
        // Team already exists
        callback(400, { Error: "A team with this name already exists" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Teams - get
// Required data: name
// Optional data: none
_teams.get = (data, callback) => {
  // Check that the name provided is valid.
  const { queryStringObject: qs } = data;
  const name =
    typeof qs.name == "string" && qs.name.trim().length > 1
      ? qs.name.trim()
      : false;
  if (name) {
    // Get the token from the headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    // verify that the given token is valid for the name
    _tokens.verifyToken(token, name, tokenIsValid => {
      if (tokenIsValid) {
        // Lookup the team
        _data.read("teams", name, (err, data) => {
          if (!err && data) {
            // Remove the hashed password from team object before return to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};
// Teams - put
// Required data: name
// Optiona data: name, password (at least one must be specified)
_teams.put = (data, callback) => {
  // Check for the required field
  const { payload } = data;
  const name =
    typeof payload.name == "string" && payload.name.trim().length > 1
      ? payload.name.trim()
      : false;

  // Check for the optional fields
  const password =
    typeof payload.password == "string" && payload.password.trim().length > 0
      ? payload.password.trim()
      : false;

  if (name) {
    if (password) {
      // Get the token from the headers
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;
      //verify that the given token is valid for the phone number
      _tokens.verifyToken(token, name, tokenIsValid => {
        if (tokenIsValid) {
          _data.read("teams", name, (err, userData) => {
            if (!err && teamData) {
              if (password) {
                userData.password = helpers.hash(password);
              }
              // Store the new updates
              _data.update("teams", name, userData, err => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: "Could not update the team." });
                }
              });
            } else {
              callback(400, { Error: "The specified team does not exists!" });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required token in header, or token is invalid"
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update!" });
    }
  } else {
    callback(400, { Error: "Missing required field!" });
  }
};
// Teams - delete
// Required field: name
_teams.delete = (data, callback) => {
  // Check that the name provided is valid.
  const { queryStringObject: qs } = data;
  const name =
    typeof qs.name == "string" && qs.name.trim().length > 1
      ? qs.name.trim()
      : false;
  // Lookup the name
  if (name) {
    // Get the token from the headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    // verify that the given token is valid for the name
    _tokens.verifyToken(token, name, tokenIsValid => {
      if (tokenIsValid) {
        _data.read("teams", name, (err, teamData) => {
          if (!err && teamData) {
            _data.delete("teams", name, err => {
              if (!err) {
                // Delete each of the votes associated with the team
                const teamVotes =
                  typeof teamData.votes == "object" &&
                  teamData.votes instanceof Array
                    ? teamData.votes
                    : [];
                const votesToDelete = teamVotes.length;
                if (votesToDelete > 0) {
                  let votesDeleted = 0;
                  let deletionError = false;
                  // loop through the votes
                  teamVotes.forEach(voteId => {
                    // Delete the vote
                    _data.delete("votes", voteId, err => {
                      if (err) {
                        deletionError = true;
                      }
                      votesDeleted++;
                      if (votesDeleted == votesToDelete) {
                        if (!deletionError) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              "Errors encountered while attempting to delete all of the teams votes. All votes may not have been deleted from the system successfully."
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: "Could not delete the specified team" });
              }
            });
          } else {
            callback(404, { Error: "Could not find the specified team." });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

module.exports = teams;
