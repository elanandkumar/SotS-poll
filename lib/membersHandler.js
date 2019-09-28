// Members handler
const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");
const { _tokens } = require("./tokensHandler");

const members = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _members[data.method](data, callback);
  } else {
    callback(405);
  }
};
const _members = {};
// Members: post
// Required data: firstName, email
// Optional data: lastName
_members.post = (data, callback) => {
  const { payload, headers } = data;
  // validate inputs
  const firstName =
    typeof payload.firstName == "string" && payload.firstName.trim().length > 0
      ? payload.firstName.trim()
      : false;
  const lastName =
    typeof payload.lastName == "string" && payload.lastName.trim().length > 0
      ? payload.lastName.trim()
      : false;
  // TODO: Add email validation
  const email =
    typeof payload.email == "string" && payload.email.trim().length > 0
      ? payload.email.trim()
      : false;

  if (firstName && email) {
    // get the token from headers
    const token = typeof headers.token == "string" ? headers.token : false;
    // Lookup the team by reading the token
    _data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        const teamName = tokenData.name;
        // Lookup team data
        _data.read("teams", teamName, (err, teamData) => {
          if (!err && teamData) {
            const teamMembers =
              typeof teamData.members == "object" &&
              teamData.members instanceof Array
                ? teamData.members
                : [];
            // verify that the team has less than the number of max-members-per-team
            if (teamMembers.length < config.maxMembers) {
              // create a random id for the member
              const memberId = helpers.createRandomString(20);
              // create the member object, and include the team's name
              const memberObject = {
                id: memberId,
                teamName,
                firstName,
                lastName,
                email
              };

              // save the object
              _data.create("members", memberId, memberObject, err => {
                if (!err) {
                  // Add the member id to the team's object
                  teamData.members = teamMembers;
                  teamData.members.push(memberId);
                  // save the new team data
                  _data.update("teams", teamName, teamData, err => {
                    if (!err) {
                      // Return the data about the new member
                      callback(200, memberObject);
                    } else {
                      callback(500, {
                        Error: "Could not update the team with new member."
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not create the new member" });
                }
              });
            } else {
              callback(400, {
                Error: `The team already has the maximum number of members ${config.maxMembers}`
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: "Missing required inputs, or inputs are invalid" });
  }
};

// Members - get
// Required data: id
// Optional: none
_members.get = (data, callback) => {
  // Check that the id is valid.
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;
  if (id) {
    // Lookup the check
    _data.read("members", id, (err, memberData) => {
      if (!err && memberData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid for the and belongs to the team who created the member
        _tokens.verifyToken(token, memberData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Return the member data
            callback(200, memberData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Members: put
// Required data: id
// Optional data: firstName, lastName, email (one must be sent)
_members.put = (data, callback) => {
  // Check for the required field
  const { payload } = data;
  const id =
    typeof payload.id == "string" && payload.id.trim().length == 20
      ? payload.id.trim()
      : false;

  // Check for the optional fields
  // validate inputs
  const firstName =
    typeof payload.firstName == "string" && payload.firstName.trim().length > 0
      ? payload.firstName.trim()
      : false;
  const lastName =
    typeof payload.lastName == "string" && payload.lastName.trim().length > 0
      ? payload.lastName.trim()
      : false;
  // TODO: Add email validation
  const email =
    typeof payload.email == "string" && payload.email.trim().length > 0
      ? payload.email.trim()
      : false;
  // Check to make sure id is valid
  if (id) {
    // Check to make sure one or more optiona fields has been sent
    if (firstName || lastName || email) {
      // Lookup the members
      _data.read("members", id, (err, memberData) => {
        if (!err && memberData) {
          // Get the token from the headers
          const token =
            typeof data.headers.token == "string" ? data.headers.token : false;
          // verify that the given token is valid and belongs to the team who created the member
          _tokens.verifyToken(token, memberData.teamName, tokenIsValid => {
            if (tokenIsValid) {
              // Update the member where necessary
              if (firstName) {
                memberData.firstName = firstName;
              }
              if (lastName) {
                memberData.lastName = lastName;
              }
              if (email) {
                memberData.email = email;
              }

              // Store the new updates
              _data.update("members", id, memberData, err => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update the member" });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400, { Error: "Member ID did not exist" });
        }
      });
    } else {
      callback(400, { error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Members - delete
// Required data: id
// Optional data: none
_members.delete = (data, callback) => {
  // Check that the id is valid.
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;
  // Lookup the team
  if (id) {
    // Lookup the member
    _data.read("members", id, (err, memberData) => {
      if (!err && memberData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid for the team
        _tokens.verifyToken(token, memberData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Delete the member data
            _data.delete("members", id, err => {
              if (!err) {
                // Lookup the team
                _data.read("teams", memberData.teamName, (err, teamData) => {
                  if (!err && teamData) {
                    const teamMembers =
                      typeof teamData.members == "object" &&
                      teamData.members instanceof Array
                        ? teamData.members
                        : [];

                    // Remove the deleted member from their list of members
                    const memberPosition = teamMembers.indexOf(id);
                    if (memberPosition > -1) {
                      teamMembers.splice(memberPosition, 1);
                      // re-save the team's data
                      _data.update(
                        "teams",
                        memberData.teamName,
                        teamData,
                        err => {
                          if (!err) {
                            callback(200);
                          } else {
                            callback(500, {
                              Error: "Could not update the team"
                            });
                          }
                        }
                      );
                    } else {
                      callback(500, {
                        Error:
                          "Could not find the member on the teams's object, so could not remove it."
                      });
                    }
                  } else {
                    callback(500, {
                      Error:
                        "Could not find the team who created the member, so could not remove the member from the list of members on the team object"
                    });
                  }
                });
              } else {
                callback(500, { Error: "Could not delete the member data" });
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: "The specified member ID does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

module.exports = members;
