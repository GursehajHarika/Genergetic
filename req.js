var request = require("request")

ocument.getElementById("requst_button").onclick = function() {


    request.get("https://genergetic.us-south.cf.appdomain.cloud/devices/", function(error, response, body) {
        console.log(response)
        console.log(error)
        console.log(body)
    })

};