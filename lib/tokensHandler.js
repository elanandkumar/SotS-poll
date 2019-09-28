const _data = require("./data");
const helpers = require("./helpers");

// Tokens handler
const tokens = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
const _tokens = {};
// Tokens: post
// Required data: name, password
// Optional data: none
_tokens.post = (data, callback) => {
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
_tokens.put = (data, callback) => {
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
_tokens.get = (data, callback) => {
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
_tokens.delete = (data, callback) => {
  // Check that the team name provided is valid.
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
_tokens.verifyToken = (id, name, callback) => {
  // Lookup the token
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (
        tokenData.name.toLowerCase() == name.toLowerCase() &&
        tokenData.expires > Date.now()
      ) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

module.exports = { tokens, _tokens };
