/**
 * Request handlers
 */
// Dependencies
const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");
// Define the handlers
const handlers = {};

// Teams handler
handlers.teams = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._teams[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Containers for the teams submethods
handlers._teams = {};
// Teams - post
// Required data: name, password
// Optional data: none
handlers._teams.post = (data, callback) => {
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
              console.log(err);
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
handlers._teams.get = (data, callback) => {
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
    handlers._tokens.verifyToken(token, name, tokenIsValid => {
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
handlers._teams.put = (data, callback) => {
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
      handlers._tokens.verifyToken(token, name, tokenIsValid => {
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
handlers._teams.delete = (data, callback) => {
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
    handlers._tokens.verifyToken(token, name, tokenIsValid => {
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

// Tokens handler
handlers.tokens = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};
// Tokens: post
// Required data: name, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  // Check that all required fields are filled out
  const { payload } = data;
  // data validation...
  const name =
    typeof payload.name == "string" && payload.name.trim().length > 1
      ? payload.name.trim()
      : false;
  const password =
    typeof payload.password == "string" && payload.password.trim().length > 0
      ? payload.password.trim()
      : false;
  if (name && password) {
    // Lookup the user who matches that name
    _data.read("teams", name, (err, teamData) => {
      if (!err && teamData) {
        // Hash the sent password, and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == teamData.hashedPassword) {
          // If valid, create a new token with a random name. Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            name,
            id: tokenId,
            expires
          };
          _data.create("tokens", tokenId, tokenObject, err => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create the new token" });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not match the specified team's stored password"
          });
        }
      } else {
        callback(400, { Error: "Could not find the specified team" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s)" });
  }
};
// Tokens: put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const { payload } = data;
  // data validation...
  const id =
    typeof payload.id == "string" && payload.id.trim().length == 20
      ? payload.id.trim()
      : false;
  const extend =
    typeof payload.extend == "boolean" && payload.extend == true ? true : false;
  if (id && extend) {
    // Lookup the token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        // check to make sure sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now.
          tokenData.expires = Date.now() * 1000 * 60 * 60;
          // store the new updates
          _data.update("tokens", id, tokenData, err => {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: "Cold not update the token's expiration"
              });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired and can not be extended"
          });
        }
      } else {
        callback(400, { Error: "Specified token does not exists" });
      }
    });
  } else {
    callback(400, {
      Error: "Missing required field(s) or field(s) are invalid"
    });
  }
};
// Tokens: get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // check that the id is valid
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;
  if (id) {
    // Lookup the token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};
// Tokens: delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that the phone number provided is valid.
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;

  if (id) {
    // Lookup the token
    _data.read("tokens", id, (err, data) => {
      if (!err && data) {
        _data.delete("tokens", id, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        callback(404, { Error: "Could not find the specified token." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Verify if a given token id currently valid for a given user
handlers._tokens.verifyToken = (id, name, callback) => {
  // Lookup the token
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.name == name && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Members handler
handlers.members = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._members[data.method](data, callback);
  } else {
    callback(405);
  }
};
handlers._members = {};
// Members: post
// Required data: firstName, email
// Optional data: lastName
handlers._members.post = (data, callback) => {
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
handlers._members.get = (data, callback) => {
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
        handlers._tokens.verifyToken(
          token,
          memberData.teamName,
          tokenIsValid => {
            if (tokenIsValid) {
              // Return the member data
              callback(200, memberData);
            } else {
              callback(403);
            }
          }
        );
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
handlers._members.put = (data, callback) => {
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
          handlers._tokens.verifyToken(
            token,
            memberData.teamName,
            tokenIsValid => {
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
            }
          );
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
handlers._members.delete = (data, callback) => {
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
        handlers._tokens.verifyToken(
          token,
          memberData.teamName,
          tokenIsValid => {
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
          }
        );
      } else {
        callback(400, { Error: "The specified member ID does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Votes handler
handlers.votes = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._votes[data.method](data, callback);
  } else {
    callback(405);
  }
};
handlers._votes = {};
// Votes: post
// Required data: title, description
// Optional data: none
handlers._votes.post = (data, callback) => {
  const { payload, headers } = data;
  // validate inputs
  const title =
    typeof payload.title == "string" && payload.title.trim().length > 0
      ? payload.title.trim()
      : false;
  const description =
    typeof payload.description == "string" &&
    payload.description.trim().length > 10
      ? payload.description.trim()
      : false;

  if (title && description) {
    // get the token from headers
    const token = typeof headers.token == "string" ? headers.token : false;
    // Lookup the team by reading the token
    _data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        const teamName = tokenData.name;
        // Lookup team data
        _data.read("teams", teamName, (err, teamData) => {
          if (!err && teamData) {
            const teamVotes =
              typeof teamData.votes == "object" &&
              teamData.votes instanceof Array
                ? teamData.votes
                : [];
            const teamMembers =
              typeof teamData.members == "object" &&
              teamData.members instanceof Array
                ? teamData.members
                : [];
            // verify that the team has less than the number of max-votes-per-team
            if (teamVotes.length < config.maxVotes) {
              // create a random id for the vote
              const voteId = helpers.createRandomString(20);
              // create the vote object, and include the team's name
              const voteObject = {
                id: voteId,
                teamName,
                title,
                description,
                members: teamMembers.map(memberId => ({
                  id: memberId,
                  count: 0
                })),
                status: "open"
              };

              // save the object
              _data.create("votes", voteId, voteObject, err => {
                if (!err) {
                  // Add the vote id to the team's object
                  teamData.votes = teamVotes;
                  teamData.votes.push(voteId);
                  // save the new team data
                  _data.update("teams", teamName, teamData, err => {
                    if (!err) {
                      // Return the data about the new member
                      callback(200, voteObject);
                    } else {
                      callback(500, {
                        Error: "Could not update the team with new vote."
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not create the new vote" });
                }
              });
            } else {
              callback(400, {
                Error: `The team already has the maximum number of votes ${config.maxVotes}`
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

// Votes - get
// Required data: id
// Optional: none
handlers._votes.get = (data, callback) => {
  // Check that the id is valid.
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;
  if (id) {
    // Lookup the check
    _data.read("votes", id, (err, voteData) => {
      if (!err && voteData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid for the and belongs to the team who created the member
        handlers._tokens.verifyToken(token, voteData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Return the member data
            callback(200, voteData);
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

// Votes: put
// Required data: id, memberId
// Optional data: title, description, status (one must be sent)
handlers._votes.put = (data, callback) => {
  // Check for the required field
  const { payload } = data;
  const id =
    typeof payload.id == "string" && payload.id.trim().length == 20
      ? payload.id.trim()
      : false;
  const memberId =
    typeof payload.memberId == "string" && payload.memberId.trim().length == 20
      ? payload.memberId.trim()
      : false;

  // Check for the optional fields
  // validate inputs
  const title =
    typeof payload.title == "string" && payload.title.trim().length > 0
      ? payload.title.trim()
      : false;
  const description =
    typeof payload.description == "string" &&
    payload.description.trim().length > 0
      ? payload.description.trim()
      : false;
  // TODO: Add email validation
  const status =
    typeof payload.status == "string" &&
    (payload.status.trim() == "open" || payload.status.trim() == "closed")
      ? payload.status.trim()
      : false;
  // Check to make sure id is valid
  if (id && memberId) {
    // Lookup the votes
    _data.read("votes", id, (err, voteData) => {
      if (!err && voteData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid and belongs to the team who created the member
        handlers._tokens.verifyToken(token, voteData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Update the vote where necessary
            if (title) {
              voteData.title = title;
            }
            if (description) {
              voteData.description = description;
            }
            if (status) {
              voteData.status = status;
            }
            const memberPosition = voteData.members.findIndex(
              m => m.id == memberId
            );
            if (memberPosition > -1) {
              const count = voteData.members[memberPosition].count + 1;
              voteData.members[memberPosition] = { id: memberId, count };
              // Store the new updates
              _data.update("votes", id, voteData, err => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update the vote" });
                }
              });
            } else {
              callback(400, { error: "Missing fields to update" });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: "Vote ID did not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Votes - delete
// Required data: id
// Optional data: none
handlers._votes.delete = (data, callback) => {
  // Check that the id is valid.
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;
  // Lookup the team
  if (id) {
    // Lookup the vote
    _data.read("votes", id, (err, voteData) => {
      if (!err && voteData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid for the team
        handlers._tokens.verifyToken(token, voteData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Delete the member data
            _data.delete("votes", id, err => {
              if (!err) {
                // Lookup the team
                _data.read("teams", voteData.teamName, (err, teamData) => {
                  if (!err && teamData) {
                    const teamVotes =
                      typeof teamData.votes == "object" &&
                      teamData.votes instanceof Array
                        ? teamData.votes
                        : [];

                    // Remove the deleted vote from their list of votes
                    const votePosition = teamVotes.indexOf(id);
                    if (votePosition > -1) {
                      teamVotes.splice(votePosition, 1);
                      // re-save the team's data
                      _data.update(
                        "teams",
                        voteData.teamName,
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
                          "Could not find the vote on the teams's object, so could not remove it."
                      });
                    }
                  } else {
                    callback(500, {
                      Error:
                        "Could not find the team who created the vote, so could not remove the vote from the list of votes on the team object"
                    });
                  }
                });
              } else {
                callback(500, { Error: "Could not delete the vote data" });
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: "The specified vote ID does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;
