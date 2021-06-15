var express = require("express");
var router = express.Router()
var async = require('async');
var cfenv = require("cfenv");


var vcapLocal, cloudant, readingdb;

var reDBName = 'readingdb'

try {
  vcapLocal = require('../vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts);
   
if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/[Cc][Ll][Oo][Uu][Dd][Aa][Nn][Tt]/)) {
    // Load the Cloudant library.
    var Cloudant = require('@cloudant/cloudant');
  
    // Initialize database with credentials
    if (appEnv.services['cloudantNoSQLDB']) {
      cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
    } else {
       // user-provided service with 'cloudant' in its name
       cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
    }
} else if (process.env.CLOUDANT_URL){
    // Load the Cloudant library.
    var Cloudant = require('@cloudant/cloudant');
  
    if (process.env.CLOUDANT_IAM_API_KEY){ // IAM API key credentials
      let cloudantURL = process.env.CLOUDANT_URL
      let cloudantAPIKey = process.env.CLOUDANT_IAM_API_KEY
      cloudant = Cloudant({ url: cloudantURL, plugins: { iamauth: { iamApiKey: cloudantAPIKey } } });
    } else { //legacy username/password credentials as part of cloudant URL
      cloudant = Cloudant(process.env.CLOUDANT_URL);
    }
}
if(cloudant){
    cloudant.db.create(reDBName, function(err, data){
        if(!err) //err if database doesn't already exists
          console.log("Created database: " + deDBName);
    })
    readingdb = cloudant.db.use(reDBName)
}

router.get('/:deviceId&:eventId', function(req, res){
  let deviceId = req.params.deviceId;
  let eventId = req.params.eventId;
  const query = {
    selector: {
      deviceId: { "$eq": deviceId},
      eventId: {'$eq': eventId}
    }
};
  readingdb.find(query, function(err, data, header){
    if(err){
      console.log(err)
      res.status(400).send(err)
    } else {
      console.log(data)
      var device = {
        deviceId: deviceId, 
        eventId: eventId,
        readings: []
      }

      for(var doc of data.docs){
        device.readings.push({
          timestamp: doc.timestamp,
          power: doc.power
        })
      }
      res.send(device)
      
    }
  })
})

module.exports = router;
