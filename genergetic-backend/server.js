var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser')
var ApplicationClient = require('@wiotp/sdk').ApplicationClient;
var ApplicationConfig = require('@wiotp/sdk').ApplicationConfig;
var device = require('./modules/devices.js')
var reading = require('./modules/readings.js')
var https = require('https')
var async = require('async');
var username = 'a-0lzl19-f3ejwfqnrx'
var password = 'qS+?1j-fj(kQEA6fIp'

process.env['WIOTP_AUTH_KEY'] = 'a-0lzl19-c2txaodlew';
process.env['WIOTP_AUTH_TOKEN'] = 'rc18h4LH+pX@)CpKdy';


let onEventReceived = function(typeId, deviceId, eventId, format, payload) {
  payload = JSON.parse(payload)
  const query = {
    selector: {
      deviceId: { "$eq": deviceId},
      eventId : { "$eq": eventId },
      typeId: {'$eq': typeId}
    }
  };
  devicedb.find(query, function(err, body, header){
    if(err){
      console.log(err)
      devicedb.insert({deviceId: deviceId, typeId: typeId, eventId: eventId}, function(err, body, header){
        if(err){
          console.log('[device db]' + err)
        }
        else {
          console.log(body)
        }
      })
    }
    else{
      console.log(body)
    }
  })
  
  readingdb.insert({timestamp: payload.timestamp, deviceId: deviceId, eventId: eventId,power: payload.power}, function(err, body, header){
    if(err){
      console.log('[reading db]' + err)
    }
    else {
      console.log(body)
    }
  })

  
}

let appConfig = ApplicationConfig.parseEnvVars();
let appClient = new ApplicationClient(appConfig);
appClient.connect();
appClient.on("deviceEvent", onEventReceived);

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
    data = JSON.parse(data);
    async.forEach(data.results, function(device, index, callback){
      appClient.subscribeToEvents(device.typeId, device.deviceId, 'status', 'json');
    })
  })
})
request.on('error', (e)=>{
  console.error(`problem with request: ${e.message}`);
})
request.end()

app.use('/devices', device);
app.use('/readings', reading)

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

let mydb, devicedb, readingdb, cloudant;
var vendor; // Because the MongoDB and Cloudant use different API commands, we
            // have to check which command should be used based on the database
            // vendor.
var dbName = 'mydb';
var deDBName = 'devicedb';
var reDBName = 'readingdb';

// Separate functions are provided for inserting/retrieving content from
// MongoDB and Cloudant databases. These functions must be prefixed by a
// value that may be assigned to the 'vendor' variable, such as 'mongodb' or
// 'cloudant' (i.e., 'cloudantInsertOne' and 'mongodbInsertOne')

var insertOne = {};
var getAll = {};

insertOne.cloudant = function(doc, response) {
  mydb.insert(doc, function(err, body, header) {
    if (err) {
      console.log('[mydb.insert] ', err.message);
      response.send("Error");
      return;
    }
    doc._id = body.id;
    response.send(doc);
  });
}

getAll.cloudant = function(response) {
  var names = [];  
  mydb.list({ include_docs: true }, function(err, body) {
    if (!err) {
      body.rows.forEach(function(row) {
        if(row.doc.name)
          names.push(row.doc.name);
      });
      response.json(names);
    }
  });
  //return names;
}

/* Endpoint to greet and add a new visitor to database.
* Send a POST request to localhost:3000/api/visitors with body
* {
*   "name": "Bob"
* }
*/
app.post("/api/visitors", function (request, response) {
  var userName = request.body.name;
  var doc = { "name" : userName };
  if(!mydb) {
    console.log("No database.");
    response.send(doc);
    return;
  }
  insertOne[vendor](doc, response);
});

/**
 * Endpoint to get a JSON array of all the visitors in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/visitors
 * </code>
 *
 * Response:
 * [ "Bob", "Jane" ]
 * @return An array of all the visitor names
 */
app.get("/api/visitors", function (request, response) {
  var names = [];
  if(!mydb) {
    response.json(names);
    return;
  }
  getAll[vendor](response);
});

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

var pmServiceName = process.env.PA_SERVICE_LABEL ? process.env.PA_SERVICE_LABEL : 'pm-20';
var pmServiceEnv = appEnv.services[pmServiceName] && appEnv.services[pmServiceName][0];

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
if(cloudant) {
  //database name
  dbName = 'mydb';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  cloudant.db.create(deDBName, function(err, data){
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + deDBName);
  })

  cloudant.db.create(reDBName, function(err, data){
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + reDBName);
  })

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);
  devicedb = cloudant.db.use(deDBName);
  readingdb = cloudant.db.use(reDBName)
  vendor = 'cloudant';
}

const deviceindex = {
  name: 'device',
  index: {
    fields: [
      'deviceId',
      'typeId',
      'eventId'
    ]
  }
}
devicedb.index(deviceindex, function(err, result){
  console.log(result);
  
})

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});

module.exports = {
  appClient: appClient
}
