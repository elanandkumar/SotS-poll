const helpers = require("./helpers");

const webRoutesHandler = {};

const getTemplateRoute = function(data, templateName, templateData, callback) {
  if (data.method === "get") {
    helpers.getTemplate(templateName, templateData, function(
      err,
      templateString
    ) {
      if (!err && templateString) {
        helpers.addUniversalTemplate(templateString, templateData, function(
          err,
          templateString
        ) {
          if (!err && templateString) {
            callback(200, templateString, "html");
          } else {
            callback(500, undefined, "html");
          }
        });
      } else {
        callback(500, undefined, "html");
      }
    });
  } else {
    callback(405, undefined, "html");
  }
};

webRoutesHandler.index = function(data, callback) {
  const templateData = {
    "head.title": "SotS Poll - Made Simple",
    "head.description":
      "Simple and easy to use poll system to choose star of the sprint",
    "body.class": "index"
  };

  getTemplateRoute(data, "index", templateData, callback);
};

// Create Account
webRoutesHandler.accountCreate = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Create an Account",
    "head.description": "Signup is easy and only takes a few seconds",
    "body.class": "accountCreate"
  };

  getTemplateRoute(data, "accountCreate", templateData, callback);
};

// Create New Session
webRoutesHandler.sessionCreate = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Login to Your Account",
    "head.description":
      "Please enter your team name and password to access your account",
    "body.class": "sessionCreate"
  };

  getTemplateRoute(data, "sessionCreate", templateData, callback);
};

// Session has been deleted
webRoutesHandler.sessionDeleted = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Logged Out",
    "head.description": "You have been logged out of your account",
    "body.class": "sessionDeleted"
  };

  getTemplateRoute(data, "sessionDeleted", templateData, callback);
};

// Edit your account
webRoutesHandler.accountEdit = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Account Settings",
    "body.class": "accountEdit"
  };

  getTemplateRoute(data, "accountEdit", templateData, callback);
};

// Account has been deleted
webRoutesHandler.accountDeleted = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Account Settings",
    "head.description": "Your account has been deleted.",
    "body.class": "accountDeleted"
  };

  getTemplateRoute(data, "accountDeleted", templateData, callback);
};

// Create a New members
webRoutesHandler.membersCreate = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Add a New Member",
    "body.class": "memberCreate"
  };

  getTemplateRoute(data, "membersCreate", templateData, callback);
};

// Dashboard (view all members)
webRoutesHandler.membersList = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Dashboard",
    "body.class": "membersList"
  };

  getTemplateRoute(data, "membersList", templateData, callback);
};

// Edit a member
webRoutesHandler.membersEdit = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Member Details",
    "body.class": "membersEdit"
  };
  getTemplateRoute(data, "membersEdit", templateData, callback);
};

// Poll create
webRoutesHandler.pollCreate = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Create Poll",
    "body.class": "pollCreate"
  };

  getTemplateRoute(data, "pollCreate", templateData, callback);
};
// Poll delete
// Poll edit/update
webRoutesHandler.pollEdit = function(data, callback) {
  // Prepare data for interpolation
  const templateData = {
    "head.title": "Edit Poll",
    "body.class": "pollEdit"
  };

  getTemplateRoute(data, "pollEdit", templateData, callback);
};

module.exports = webRoutesHandler;
