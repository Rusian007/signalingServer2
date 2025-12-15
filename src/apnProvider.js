// apnProvider.js or at top of your file
const apn = require('apn');
const path = require('path');
const appleAPNKey = require(path.join(__dirname, '../firebase/apple_key.json'));

var options = {

    token: {
      key: null,//path.join(__dirname, '../firebase/AuthKey.p8'),
      keyId: appleAPNKey.keyid,
      teamId: appleAPNKey.teamid
    },
    production: false
  };

const apnProvider = new apn.Provider(options);

module.exports = apnProvider;

