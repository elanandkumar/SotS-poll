// Poll handler
const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");
const { _tokens } = require("./tokensHandler");

const poll = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _poll[data.method](data, callback);
  } else {
    callback(405);
  }
};
const _poll = {};
// Poll: post
// Required data: title, description
// Optional data: none
_poll.post = (data, callback) => {
  const { payload, headers } = data;
  // validate inputs
  const pollTitle =
    typeof payload.pollTitle == "string" && payload.pollTitle.trim().length > 0
      ? payload.pollTitle.trim()
      : false;
  const pollDescription =
    typeof payload.pollDescription == "string" &&
    payload.pollDescription.trim().length > 10
      ? payload.pollDescription.trim()
      : false;
  const members = ["vo4gsBmmNAvPfMNRwpoY", "pRfMUbJQPQeCvGrSQSgK"];
  /*  typeof payload.members == "object" &&
    payload.members instanceof Array &&
    payload.members.length >= 2
      ? payload.members
      : false;*/
  if (pollTitle && members) {
    // get the token from headers
    const token = typeof headers.token == "string" ? headers.token : false;
    // Lookup the team by reading the token
    _data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        const teamName = tokenData.name;
        // Lookup team data
        _data.read("teams", teamName, (err, teamData) => {
          if (!err && teamData) {
            const teamPoll =
              typeof teamData.poll == "object" && teamData.poll instanceof Array
                ? teamData.poll
                : [];
            // verify that the team has less than the number of max-poll-per-team
            if (teamPoll.length < config.maxPoll) {
              // create a random id for the poll
              const pollId = helpers.createRandomString(20);
              // create the poll object, and include the team's name
              const pollObject = {
                id: pollId,
                teamName,
                title: pollTitle,
                description: pollDescription || "",
                members,
                status: "open"
              };

              // save the object
              _data.create("poll", pollId, pollObject, err => {
                if (!err) {
                  // Add the poll id to the team's object
                  teamData.poll = teamPoll;
                  teamData.poll.push(pollId);
                  // save the new team data
                  _data.update("teams", teamName, teamData, err => {
                    if (!err) {
                      // Return the data about the new poll created
                      callback(200, pollObject);
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

// Poll - get
// Required data: id
// Optional: none
_poll.get = (data, callback) => {
  // Check that the id is valid.
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;
  if (id) {
    // Lookup the check
    _data.read("poll", id, (err, pollData) => {
      if (!err && pollData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid for the and belongs to the team who created the member
        _tokens.verifyToken(token, pollData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Return the member data
            callback(200, pollData);
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

// Poll: put
// Required data: id, memberId
// Optional data: title, description, status (one must be sent)
_poll.put = (data, callback) => {
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
    // Lookup the poll
    _data.read("poll", id, (err, pollData) => {
      if (!err && pollData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid and belongs to the team who created the member
        _tokens.verifyToken(token, pollData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Update the poll where necessary
            if (title) {
              pollData.title = title;
            }
            if (description) {
              pollData.description = description;
            }
            if (status) {
              pollData.status = status;
            }
            const memberPosition = pollData.members.findIndex(
              m => m.id == memberId
            );
            if (memberPosition > -1) {
              const count = pollData.members[memberPosition].count + 1;
              pollData.members[memberPosition] = { id: memberId, count };
              // Store the new updates
              _data.update("poll", id, pollData, err => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update the poll" });
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
        callback(400, { Error: "poll ID did not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Poll - delete
// Required data: id
// Optional data: none
_poll.delete = (data, callback) => {
  // Check that the id is valid.
  const { queryStringObject: qs } = data;
  const id =
    typeof qs.id == "string" && qs.id.trim().length == 20
      ? qs.id.trim()
      : false;
  // Lookup the team
  if (id) {
    // Lookup the poll
    _data.read("poll", id, (err, pollData) => {
      if (!err && pollData) {
        // Get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        // verify that the given token is valid for the team
        _tokens.verifyToken(token, pollData.teamName, tokenIsValid => {
          if (tokenIsValid) {
            // Delete the member data
            _data.delete("poll", id, err => {
              if (!err) {
                // Lookup the team
                _data.read("teams", pollData.teamName, (err, teamData) => {
                  if (!err && teamData) {
                    const teamPoll =
                      typeof teamData.poll == "object" &&
                      teamData.poll instanceof Array
                        ? teamData.poll
                        : [];

                    // Remove the deleted poll from their list of poll
                    const pollPosition = teamPoll.indexOf(id);
                    if (pollPosition > -1) {
                      teamPoll.splice(pollPosition, 1);
                      // re-save the team's data
                      _data.update(
                        "teams",
                        pollData.teamName,
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
                          "Could not find the poll on the teams's object, so could not remove it."
                      });
                    }
                  } else {
                    callback(500, {
                      Error:
                        "Could not find the team who created the poll, so could not remove the poll from the list of polls on the team object"
                    });
                  }
                });
              } else {
                callback(500, { Error: "Could not delete the poll data" });
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: "The specified poll ID does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

module.exports = poll;
