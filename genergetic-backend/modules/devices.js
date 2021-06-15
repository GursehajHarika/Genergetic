var express = require("express");
var router = express.Router()
var https = require('https')
var username = 'a-0lzl19-f3ejwfqnrx'
var password = 'qS+?1j-fj(kQEA6fIp'
var async = require('async');

var cfenv = require("cfenv");


var vcapLocal, cloudant, devicedb;

var deDBName = 'devicedb'

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
    cloudant.db.create(deDBName, function(err, data){
        if(!err) //err if database doesn't already exists
          console.log("Created database: " + deDBName);
    })
    devicedb = cloudant.db.use(deDBName)
}

router.get('/', function(req, res){
    var request = https.request({
        host:'0lzl19.internetofthings.ibmcloud.com',
        port:'443',
        path:'/api/v0002/bulk/devices',
        method: 'GET',
        headers: {
            Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
        }
    }, function(response){
        var data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk)=>{
            data += chunk
        })
        response.on('end', ()=>{
            res.status(response.statusCode).json(JSON.parse(data))
        })
    })
    request.on('error', (e)=>{
        console.error(`problem with request: ${e.message}`);
    })
    request.end()
})

router.get('/:deviceId', function(req, res, next){
    let deviceId = req.params.deviceId;
    const query = {
        selector: {
          deviceId: { "$eq": deviceId}
        }
    };

    devicedb.find(query, function(err, data, header){
        if(err){
            console.log(err)
            res.status(400).send(err)
        } else {
            console.log(data)
            var device = {
                deviceId: deviceId,
                typeId: '',
                eventIds: []
            }
            
            for(var doc of data.docs){
                if(!device.typeId){
                    device.typeId = doc.typeId
                }
                device.eventIds.push(doc.eventId)
            }

            res.send(device)
        }
    })
})

module.exports = router