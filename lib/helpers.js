/**
 *
 */
// Dependencies
const crypto = require("crypto");
const config = require("./config");
const path = require("path");
const fs = require("fs");
const helpers = {};

// create a SHA256 hash
helpers.hash = str => {
  if (typeof str == "string" && str.length > 0) {
    const hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};
// Parse a json string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = strLength => {
  strLength = typeof strLength == "number" && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define all the possible characters that could go into a string;
    const possibleCharacters =
      "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    // start the final string
    let str = "";
    for (let i = 1; i <= strLength; i++) {
      // Get a random character from the possibleCharacters string
      const randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      // Append this character to the final string
      str += randomCharacter;
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
};

// Get the string content of a template
helpers.getTemplate = function(templateName, data, callback) {
  templateName =
    typeof templateName == "string" && templateName.length > 0
      ? templateName
      : false;
  data = typeof data == "object" && data !== null ? data : {};
  if (templateName) {
    const templateDir = path.join(__dirname, "/../templates/");
    fs.readFile(templateDir + templateName + ".html", "utf8", function(
      err,
      str
    ) {
      if (!err && str && str.length > 0) {
        // Do Interpolation on the string
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback("No template could be found");
      }
    });
  } else {
    callback("A valid template name was not specified.");
  }
};

// Add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers.addUniversalTemplate = function(str, data, callback) {
  str = typeof str == "string" && str.length > 0 ? str : "";
  data = typeof data == "object" && data !== null ? data : {};
  // Get the header
  helpers.getTemplate("_header", data, function(err, headerString) {
    if (!err && headerString) {
      // Get the footer
      helpers.getTemplate("_footer", data, function(err, footerString) {
        if (!err && footerString) {
          // Add them all together
          const fullString = headerString + str + footerString;
          callback(false, fullString);
        } else {
          callback("Could not find the footer template");
        }
      });
    } else {
      callback("Could not find the header template");
    }
  });
};

// Take a given string and a data object and find/replace all the keys withing it
helpers.interpolate = function(str, data) {
  str = typeof str == "string" && str.length > 0 ? str : "";
  data = typeof data == "object" && data !== null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with "global"
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  }

  // For each key in the data object, insert its value into the string at the correspoinding placeholder
  for (let keyName in data) {
    if (data.hasOwnProperty(keyName) && typeof data[keyName] == "string") {
      const replace = data[keyName];
      const find = `{${keyName}}`;
      str = str.replace(find, replace);
    }
  }

  return str;
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = function(fileName, callback) {
  fileName =
    typeof fileName == "string" && fileName.length > 0 ? fileName : false;
  if (fileName) {
    const publicDir = path.join(__dirname, "/../public/");
    fs.readFile(publicDir + fileName, function(err, data) {
      if (!err && data) {
        callback(false, data);
      } else {
        callback("No file could be found");
      }
    });
  } else {
    callback("A valid file name was not specified");
  }
};

// Get content type
helpers.getContentType = function(trimmedAssetName) {
  let contentType = "plain";
  if (trimmedAssetName.indexOf(".css") > -1) {
    contentType = "css";
  }
  if (trimmedAssetName.indexOf(".png") > -1) {
    contentType = "png";
  }
  if (trimmedAssetName.indexOf(".jpg") > -1) {
    contentType = "jpg";
  }
  if (trimmedAssetName.indexOf(".ico") > -1) {
    contentType = "favicon";
  }
  return contentType;
};

// Get the payload by content type
helpers.getPayloadByContentType = function(res, payload, contentType) {
  // Determine the type of response fallback to JSON
  contentType = typeof contentType == "string" ? contentType : "json";

  let payloadString = "";
  if (contentType == "json") {
    res.setHeader("Content-Type", "application/json");
    payload = typeof payload == "object" ? payload : {};
    payloadString = JSON.stringify(payload);
  }

  if (contentType == "html") {
    res.setHeader("Content-Type", "text/html");
    payloadString = typeof payload == "string" ? payload : "";
  }

  if (contentType == "favicon") {
    res.setHeader("Content-Type", "image/x-icon");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }

  if (contentType == "css") {
    res.setHeader("Content-Type", "text/css");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }

  if (contentType == "png") {
    res.setHeader("Content-Type", "image/png");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }

  if (contentType == "jpg") {
    res.setHeader("Content-Type", "image/jpeg");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }

  if (contentType == "plain") {
    res.setHeader("Content-Type", "text/plain");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }

  return payloadString;
};

// Export the module
module.exports = helpers;
