/*
 * Frontend Logic for application
 *
 */

// Container for frontend application
var app = {};

// Config
app.config = {
  sessionToken: false
};

// AJAX Client (for RESTful API)
app.client = {};

// Interface for making API calls
app.client.request = function(
  headers,
  path,
  method,
  queryStringObject,
  payload,
  callback
) {
  // Set defaults
  headers = typeof headers == "object" && headers !== null ? headers : {};
  path = typeof path == "string" ? path : "/";
  method =
    typeof method == "string" &&
    ["POST", "GET", "PUT", "DELETE"].indexOf(method.toUpperCase()) > -1
      ? method.toUpperCase()
      : "GET";
  queryStringObject =
    typeof queryStringObject == "object" && queryStringObject !== null
      ? queryStringObject
      : {};
  payload = typeof payload == "object" && payload !== null ? payload : {};
  callback = typeof callback == "function" ? callback : false;

  // For each query string parameter sent, add it to the path
  var requestUrl = path + "?";
  var counter = 0;
  for (var queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at least one query string parameter has already been added, preprend new ones with an ampersand
      if (counter > 1) {
        requestUrl += "&";
      }
      // Add the key and value
      requestUrl += queryKey + "=" + queryStringObject[queryKey];
    }
  }

  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-type", "application/json");

  // For each header sent, add it to the request
  for (var headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      var statusCode = xhr.status;
      var responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          var parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, false);
        }
      }
    }
  };

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

// Bind the logout button
app.bindLogoutButton = function() {
  document
    .getElementById("logoutButton")
    .addEventListener("click", function(e) {
      // Stop it from redirecting anywhere
      e.preventDefault();

      // Log the team out
      app.logTeamOut();
    });
};

// Log the team out then redirect them
app.logTeamOut = function(redirectTeam) {
  // Set redirectTeam to default to true
  redirectTeam = typeof redirectTeam == "boolean" ? redirectTeam : true;

  // Get the current token id
  var tokenId =
    typeof app.config.sessionToken.id == "string"
      ? app.config.sessionToken.id
      : false;

  // Send the current token to the tokens endpoint to delete it
  var queryStringObject = {
    id: tokenId
  };
  app.client.request(
    undefined,
    "api/tokens",
    "DELETE",
    queryStringObject,
    undefined,
    function(statusCode, responsePayload) {
      // Set the app.config token as false
      app.setSessionToken(false);

      // Send the team to the logged out page
      if (redirectTeam) {
        window.location = "/session/deleted";
      }
    }
  );
};

// Bind the forms
app.bindForms = function() {
  if (document.querySelector("form")) {
    var allForms = document.querySelectorAll("form");
    for (var i = 0; i < allForms.length; i++) {
      console.log(allForms[i]);
      allForms[i].addEventListener("submit", function(e) {
        // Stop it from submitting
        e.preventDefault();
        var formId = this.id;
        var path = this.action;
        var method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector("#" + formId + " .formError").style.display =
          "none";

        // Hide the success message (if it's currently shown due to a previous error)
        if (document.querySelector("#" + formId + " .formSuccess")) {
          document.querySelector("#" + formId + " .formSuccess").style.display =
            "none";
        }

        // Turn the inputs into a payload
        var payload = {};
        var elements = this.elements;
        for (var i = 0; i < elements.length; i++) {
          if (elements[i].type !== "submit") {
            // Determine class of element and set value accordingly
            var classOfElement =
              typeof elements[i].classList.value == "string" &&
              elements[i].classList.value.length > 0
                ? elements[i].classList.value
                : "";
            var valueOfElement =
              elements[i].type == "checkbox" &&
              classOfElement.indexOf("multiSelect") == -1
                ? elements[i].checked
                : classOfElement.indexOf("intval") == -1
                ? elements[i].value
                : parseInt(elements[i].value);
            var elementIsChecked = elements[i].checked;
            // Override the method of the form if the input's name is _method
            var nameOfElement = elements[i].name;
            if (nameOfElement == "_method") {
              method = valueOfElement;
            } else {
              // Create an payload field named "method" if the elements name is actually httpmethod
              if (nameOfElement == "httpmethod") {
                nameOfElement = "method";
              }
              // Create an payload field named "id" if the elements name is actually uid
              if (nameOfElement == "uid") {
                nameOfElement = "id";
              }
              // If the element has the class "multiSelect" add its value(s) as array elements
              if (classOfElement.indexOf("multiSelect") > -1) {
                if (elementIsChecked) {
                  payload[nameOfElement] =
                    typeof payload[nameOfElement] == "object" &&
                    payload[nameOfElement] instanceof Array
                      ? payload[nameOfElement]
                      : [];
                  payload[nameOfElement].push(valueOfElement);
                }
              } else {
                payload[nameOfElement] = valueOfElement;
              }
            }
          }
        }

        // If the method is DELETE, the payload should be a queryStringObject instead
        var queryStringObject = method == "DELETE" ? payload : {};

        // Call the API
        app.client.request(
          undefined,
          path,
          method,
          queryStringObject,
          payload,
          function(statusCode, responsePayload) {
            // Display an error on the form if needed
            if (statusCode !== 200) {
              if (statusCode == 403) {
                // log the team out
                app.logTeamOut();
              } else {
                // Try to get the error from the api, or set a default error message
                var error =
                  typeof responsePayload.Error == "string"
                    ? responsePayload.Error
                    : "An error has occured, please try again";

                // Set the formError field with the error text
                document.querySelector(
                  "#" + formId + " .formError"
                ).innerHTML = error;

                // Show (unhide) the form error field on the form
                document.querySelector(
                  "#" + formId + " .formError"
                ).style.display = "block";
              }
            } else {
              // If successful, send to form response processor
              app.formResponseProcessor(formId, payload, responsePayload);
            }
          }
        );
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = function(formId, requestPayload, responsePayload) {
  var functionToCall = false;
  // If account creation was successful, try to immediately log the team in
  if (formId == "accountCreate") {
    // Take the team and password, and use it to log the team in
    var newPayload = {
      name: requestPayload.name,
      password: requestPayload.password
    };

    app.client.request(
      undefined,
      "api/tokens",
      "POST",
      undefined,
      newPayload,
      function(newStatusCode, newResponsePayload) {
        // Display an error on the form if needed
        if (newStatusCode !== 200) {
          // Set the formError field with the error text
          document.querySelector("#" + formId + " .formError").innerHTML =
            "Sorry, an error has ocurred. Please try again.";

          // Show (unhide) the form error field on the form
          document.querySelector("#" + formId + " .formError").style.display =
            "block";
        } else {
          // If successful, set the token and redirect the team
          app.setSessionToken(newResponsePayload);
          window.location = "/members/all";
        }
      }
    );
  }
  // If login was successful, set the token in localstorage and redirect the team
  if (formId == "sessionCreate") {
    app.setSessionToken(responsePayload);
    window.location = "/members/all";
  }

  // If forms saved successfully and they have success messages, show them
  var formsWithSuccessMessages = [
    "accountEdit1",
    "accountEdit2",
    "membersEdit1",
    "pollEdit1"
  ];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector("#" + formId + " .formSuccess").style.display =
      "block";
  }

  // If the team just deleted their account, redirect them to the account-delete page
  if (formId == "accountEdit3") {
    app.logTeamOut(false);
    window.location = "/account/deleted";
  }

  // If the team just created a new member or poll successfully, redirect back to the dashboard
  if (formId == "membersCreate" || formId == "pollCreate") {
    window.location = "/members/all";
  }

  // If the team just deleted a member, redirect them to the dashboard
  if (formId == "membersEdit2" || formId === "pollEdit2") {
    window.location = "/members/all";
  }
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function() {
  var tokenString = localStorage.getItem("token");
  if (typeof tokenString == "string") {
    try {
      var token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if (typeof token == "object") {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch (e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function(add) {
  var target = document.querySelector("body");
  if (add) {
    target.classList.add("loggedIn");
  } else {
    target.classList.remove("loggedIn");
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function(token) {
  app.config.sessionToken = token;
  var tokenString = JSON.stringify(token);
  localStorage.setItem("token", tokenString);
  if (typeof token == "object") {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = function(callback) {
  var currentToken =
    typeof app.config.sessionToken == "object"
      ? app.config.sessionToken
      : false;
  if (currentToken) {
    // Update the token with a new expiration
    var payload = {
      id: currentToken.id,
      extend: true
    };
    app.client.request(
      undefined,
      "api/tokens",
      "PUT",
      undefined,
      payload,
      function(statusCode, responsePayload) {
        // Display an error on the form if needed
        if (statusCode == 200) {
          // Get the new token details
          var queryStringObject = { id: currentToken.id };
          app.client.request(
            undefined,
            "api/tokens",
            "GET",
            queryStringObject,
            undefined,
            function(statusCode, responsePayload) {
              // Display an error on the form if needed
              if (statusCode == 200) {
                app.setSessionToken(responsePayload);
                callback(false);
              } else {
                app.setSessionToken(false);
                callback(true);
              }
            }
          );
        } else {
          app.setSessionToken(false);
          callback(true);
        }
      }
    );
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Load data on the page
app.loadDataOnPage = function() {
  // Get the current page from the body class
  var bodyClasses = document.querySelector("body").classList;
  var primaryClass = typeof bodyClasses[0] == "string" ? bodyClasses[0] : false;

  // Logic for account settings page
  if (primaryClass == "accountEdit") {
    app.loadAccountEditPage();
  }

  // Logic for dashboard page
  if (primaryClass == "membersList") {
    app.loadMembersListPage();
  }

  // Logic for member details page
  if (primaryClass == "membersEdit") {
    app.loadMembersEditPage();
  }

  // Logic for poll page
  if (primaryClass === "pollCreate") {
    app.loadPollCreatePage();
  }

  if (primaryClass === "pollEdit") {
    app.loadPollEditPage();
  }
};

app.loadPollEditPage = function() {
  var id =
    typeof window.location.href.split("=")[1] == "string" &&
    window.location.href.split("=")[1].length > 0
      ? window.location.href.split("=")[1]
      : false;
  if (id) {
    // Fetch the poll data
    var queryStringObject = {
      id: id
    };

    app.client.request(
      undefined,
      "api/poll",
      "GET",
      queryStringObject,
      undefined,
      function(statusCode, responsePayload) {
        if (statusCode == 200) {
          // Put the hidden id field into both forms
          var hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");
          for (var i = 0; i < hiddenIdInputs.length; i++) {
            hiddenIdInputs[i].value = responsePayload.id;
          }

          // Put the data into the top form as values where needed
          document.querySelector("#pollEdit1 .pollIdInput").value =
            responsePayload.id;
          document.querySelector("#pollEdit1 .teamNameInput").value =
            responsePayload.teamName;
          document.querySelector("#pollEdit1 .pollTitleInput").value =
            responsePayload.title;
          document.querySelector("#pollEdit1 .pollDescriptionInput").value =
            responsePayload.description;

          app.client.request(
            undefined,
            "api/teams",
            "GET",
            { name: responsePayload.teamName },
            undefined,
            function(statusCode, responsePayload) {
              if (statusCode == 200) {
                var allMembers =
                  typeof responsePayload.members == "object" &&
                  responsePayload.members instanceof Array &&
                  responsePayload.members.length > 0
                    ? responsePayload.members
                    : [];
                if (allMembers.length >= 2) {
                  // Show each added member as a new row in the table
                  allMembers.forEach(function(memberId) {
                    // Get the data for the member
                    var newQueryStringObject = {
                      id: memberId
                    };
                    app.client.request(
                      undefined,
                      "api/members",
                      "GET",
                      newQueryStringObject,
                      undefined,
                      function(statusCode, responsePayload) {
                        if (statusCode == 200) {
                          // var memberData = responsePayload;
                          // Make the member data into a table row
                          var membersDiv = document.getElementById(
                            "membersList"
                          );
                          var memberDiv = document.createElement("div");
                          var checkbox = document.createElement("input");
                          // Assigning the attributes
                          // to created checkbox
                          checkbox.type = "checkbox";
                          checkbox.name =
                            "teamMember-" + responsePayload.firstName;
                          checkbox.value = responsePayload.email;
                          checkbox.id = responsePayload.id;
                          checkbox.checked = true;
                          // TODO. mark it as checked if data is available.
                          var label = document.createElement("label");
                          label.className = "no-select nameChip";
                          label.htmlFor = responsePayload.id;
                          label.innerText =
                            responsePayload.lastName +
                            ", " +
                            responsePayload.firstName +
                            " (" +
                            responsePayload.email +
                            ")";
                          memberDiv.appendChild(checkbox);
                          memberDiv.appendChild(label);
                          membersDiv.appendChild(memberDiv);
                        } else {
                          console.log(
                            "Error trying to load member ID: ",
                            memberId
                          );
                        }
                      }
                    );
                  });
                } else {
                  alert("Please add team members first to create poll");
                  // If the request comes back as something other than 200, log the team out (on the assumption that the api is temporarily down or the teams token is bad)
                  window.location = "/members/all";
                }
              } else {
                window.location = "/members/all";
              }
            }
          );
        } else {
          window.location = "/members/all";
        }
      }
    );
  } else {
    window.location = "/members/all";
  }
};

// Load the poll create page specifically
app.loadPollCreatePage = function() {
  var teamName =
    typeof app.config.sessionToken.name == "string"
      ? app.config.sessionToken.name
      : false;
  if (teamName) {
    // Fetch the team data
    var queryStringObject = {
      name: teamName
    };
    app.client.request(
      undefined,
      "api/teams",
      "GET",
      queryStringObject,
      undefined,
      function(statusCode, responsePayload) {
        if (statusCode == 200) {
          // Put the data into the forms as values where needed
          document.querySelector("#pollCreate .teamNameInput").value =
            responsePayload.name;

          // Put the hidden name field into both forms
          var hiddenTeamNameInputs = document.querySelectorAll(
            "input.hiddenTeamNameInput"
          );
          for (var i = 0; i < hiddenTeamNameInputs.length; i++) {
            hiddenTeamNameInputs[i].value = responsePayload.name;
          }
          // load team members.
          var allMembers =
            typeof responsePayload.members == "object" &&
            responsePayload.members instanceof Array &&
            responsePayload.members.length > 0
              ? responsePayload.members
              : [];
          if (allMembers.length >= 2) {
            // Show each added member as a new row in the table
            allMembers.forEach(function(memberId) {
              // Get the data for the member
              var newQueryStringObject = {
                id: memberId
              };
              app.client.request(
                undefined,
                "api/members",
                "GET",
                newQueryStringObject,
                undefined,
                function(statusCode, responsePayload) {
                  if (statusCode == 200) {
                    // var memberData = responsePayload;
                    // Make the member data into a table row
                    var membersDiv = document.getElementById("membersList");
                    var memberDiv = document.createElement("div");
                    var checkbox = document.createElement("input");
                    // Assigning the attributes
                    // to created checkbox
                    checkbox.type = "checkbox";
                    checkbox.name = "teamMember-" + responsePayload.firstName;
                    checkbox.value = responsePayload.email;
                    checkbox.id = responsePayload.id;
                    // TODO. mark it as checked if data is available.
                    var label = document.createElement("label");
                    label.className = "no-select nameChip";
                    label.htmlFor = responsePayload.id;
                    label.innerText =
                      responsePayload.lastName +
                      ", " +
                      responsePayload.firstName +
                      " (" +
                      responsePayload.email +
                      ")";
                    memberDiv.appendChild(checkbox);
                    memberDiv.appendChild(label);
                    membersDiv.appendChild(memberDiv);
                  } else {
                    console.log("Error trying to load member ID: ", memberId);
                  }
                }
              );
            });
          } else {
            alert("Please add team members first to create poll");
            // If the request comes back as something other than 200, log the team out (on the assumption that the api is temporarily down or the teams token is bad)
            window.location = "/members/all";
          }
        }
      }
    );
  } else {
    app.logTeamOut();
  }
};

// Load the account edit page specifically
app.loadAccountEditPage = function() {
  // Get the team name from the current token, or log the team out if none is there
  var teamName =
    typeof app.config.sessionToken.name == "string"
      ? app.config.sessionToken.name
      : false;
  if (teamName) {
    // Fetch the team data
    var queryStringObject = {
      name: teamName
    };
    app.client.request(
      undefined,
      "api/teams",
      "GET",
      queryStringObject,
      undefined,
      function(statusCode, responsePayload) {
        if (statusCode == 200) {
          // Put the data into the forms as values where needed
          document.querySelector("#accountEdit1 .teamNameInput").value =
            responsePayload.name;

          // Put the hidden name field into both forms
          var hiddenTeamNameInputs = document.querySelectorAll(
            "input.hiddenTeamNameInput"
          );
          for (var i = 0; i < hiddenTeamNameInputs.length; i++) {
            hiddenTeamNameInputs[i].value = responsePayload.name;
          }
        } else {
          // If the request comes back as something other than 200, log the team our (on the assumption that the api is temporarily down or the teams token is bad)
          app.logTeamOut();
        }
      }
    );
  } else {
    app.logTeamOut();
  }
};

// Load the dashboard page specifically
app.loadMembersListPage = function() {
  // Get the team name from the current token, or log the team out if none is there
  var name =
    typeof app.config.sessionToken.name == "string"
      ? app.config.sessionToken.name
      : false;
  if (name) {
    // Fetch the team data
    var queryStringObject = {
      name: name
    };
    app.client.request(
      undefined,
      "api/teams",
      "GET",
      queryStringObject,
      undefined,
      function(statusCode, responsePayload) {
        if (statusCode == 200) {
          // Determine how many members the team has
          var allMembers =
            typeof responsePayload.members == "object" &&
            responsePayload.members instanceof Array &&
            responsePayload.members.length > 0
              ? responsePayload.members
              : [];
          if (allMembers.length > 0) {
            // Show each added member as a new row in the table
            allMembers.forEach(function(memberId) {
              // Get the data for the member
              var newQueryStringObject = {
                id: memberId
              };
              app.client.request(
                undefined,
                "api/members",
                "GET",
                newQueryStringObject,
                undefined,
                function(statusCode, responsePayload) {
                  if (statusCode == 200) {
                    // var memberData = responsePayload;
                    // Make the member data into a table row
                    var table = document.getElementById("membersListTable");
                    var tr = table.insertRow(-1);
                    tr.classList.add("memberRow");
                    var td0 = tr.insertCell(0);
                    var td1 = tr.insertCell(1);
                    var td2 = tr.insertCell(2);
                    var td3 = tr.insertCell(3);
                    td0.innerHTML = responsePayload.firstName;
                    td1.innerHTML = responsePayload.lastName;
                    td2.innerHTML = responsePayload.email;
                    td3.innerHTML =
                      '<a href="/members/edit?id=' +
                      responsePayload.id +
                      '">View / Edit / Delete</a>';
                  } else {
                    console.log("Error trying to load member ID: ", memberId);
                  }
                }
              );
            });

            if (allMembers.length < 10) {
              // Show the createMember CTA
              document.getElementById("createMemberCTA").style.display =
                "block";
            }
          } else {
            // Show 'you have no members' message
            document.getElementById("noMembersMessage").style.display =
              "table-row";

            // Show the createMember CTA
            document.getElementById("createMemberCTA").style.display = "block";
          }
          const allPoll =
            typeof responsePayload.poll == "object" &&
            responsePayload.poll instanceof Array &&
            responsePayload.poll.length > 0
              ? responsePayload.poll
              : [];
          if (allPoll.length > 0) {
            // Show each added poll as a new row in the table
            allPoll.forEach(function(pollId) {
              // Get the data for the member
              var newQueryStringObject = {
                id: pollId
              };
              app.client.request(
                undefined,
                "api/poll",
                "GET",
                newQueryStringObject,
                undefined,
                function(statusCode, responsePayload) {
                  if (statusCode == 200) {
                    // Add the poll data into a table row
                    var table = document.getElementById("pollListTable");
                    var tr = table.insertRow(-1);
                    tr.classList.add("memberRow");
                    var td0 = tr.insertCell(0);
                    var td1 = tr.insertCell(1);
                    var td2 = tr.insertCell(2);
                    td0.innerHTML = responsePayload.title;
                    td1.innerHTML = responsePayload.description;
                    td2.innerHTML =
                      '<a href="/poll/edit?id=' +
                      responsePayload.id +
                      '">View / Edit / Delete</a>';
                  } else {
                    console.log("Error trying to load poll ID: ", pollId);
                  }
                }
              );
            });

            if (allPoll.length < 5) {
              // Show the createPoll CTA
              document.getElementById("createPollCTA").style.display = "block";
            }
          } else {
            // Show 'you have no members' message
            document.getElementById("noPollMessage").style.display =
              "table-row";

            // Show the createMember CTA
            document.getElementById("createPollCTA").style.display = "block";
          }
        } else {
          // If the request comes back as something other than 200, log the team our (on the assumption that the api is temporarily down or the teams token is bad)
          app.logTeamOut();
        }
      }
    );
  } else {
    app.logTeamOut();
  }
};

// Load the member edit page specifically
app.loadMembersEditPage = function() {
  // Get the check id from the query string, if none is found then redirect back to dashboard
  var id =
    typeof window.location.href.split("=")[1] == "string" &&
    window.location.href.split("=")[1].length > 0
      ? window.location.href.split("=")[1]
      : false;

  if (id) {
    // Fetch the member data
    var queryStringObject = {
      id: id
    };

    app.client.request(
      undefined,
      "api/members",
      "GET",
      queryStringObject,
      undefined,
      function(statusCode, responsePayload) {
        if (statusCode == 200) {
          // Put the hidden id field into both forms
          var hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");
          for (var i = 0; i < hiddenIdInputs.length; i++) {
            hiddenIdInputs[i].value = responsePayload.id;
          }

          // Put the data into the top form as values where needed
          document.querySelector("#membersEdit1 .memberIdInput").value =
            responsePayload.id;
          document.querySelector("#membersEdit1 .teamNameInput").value =
            responsePayload.teamName;
          document.querySelector("#membersEdit1 .firstNameInput").value =
            responsePayload.firstName;
          document.querySelector("#membersEdit1 .lastNameInput").value =
            responsePayload.lastName;
          document.querySelector("#membersEdit1 .emailInput").value =
            responsePayload.email;
        } else {
          // If the request comes back as something other than 200, redirect back to dashboard
          window.location = "/members/all";
        }
      }
    );
  } else {
    window.location = "/members/all";
  }
};

// Loop to renew token often
app.tokenRenewalLoop = function() {
  setInterval(function() {
    app.renewToken(function(err) {
      if (!err) {
        console.log("Token renewed successfully @ " + Date.now());
      }
    });
  }, 1000 * 60);
};

// Init (bootstrapping)
app.init = function() {
  // Bind all form submissions
  app.bindForms();

  // Bind logout logout button
  app.bindLogoutButton();

  // Get the token from localstorage
  app.getSessionToken();

  // Renew token
  app.tokenRenewalLoop();

  // Load data on page
  app.loadDataOnPage();
};

// Call the init processes after the window loads
window.onload = function() {
  app.init();
};
