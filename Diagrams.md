
## Architecture Diagram:

![Architecture Diagram](https://github.com/GursehajHarika/Genergetic/blob/main/public/images/architecture_diagram.png)

### Description:

Genergetic project consists three main parts, Genergetic app, Genergetic server and Genegergetic tag (hardware). 
    
   * Genergetic app interacts with users and make API calls to Genergetic server.
    
   * Genergetic server are the controller for three services on IBM Cloud, they are Waston Machine Learning, Cloudant, and Waston IoT Platform. Genergetic server is deployed onto IBM Cloud Foundry
   
   * Genergetic tag runs scripts to send MQTT messages to Waston IoT Platform, and the messages include useful data such as timestamp and readings from the device. 
