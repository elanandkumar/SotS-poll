// Votes handler
const _data = require("./data");
const { _tokens } = require("./tokensHandler");

const votes = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _votes[data.method](data, callback);
  } else {
    callback(405);
  }
};
const _votes = {};
// Votes: post
// Required data: title, description
// Optional data: none
_votes.post = (data, callback) => {
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
_votes.get = (data, callback) => {
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
        _tokens.verifyToken(token, voteData.teamName, tokenIsValid => {
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
_votes.put = (data, callback) => {
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
        _tokens.verifyToken(token, voteData.teamName, tokenIsValid => {
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
_votes.delete = (data, callback) => {
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
        _tokens.verifyToken(token, voteData.teamName, tokenIsValid => {
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

module.exports = votes;
