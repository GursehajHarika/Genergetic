
## Architecture Diagram:

![Architecture Diagram](https://github.com/GursehajHarika/Genergetic/blob/main/public/images/architecture_diagram.png)

### Description:

Genergetic project consists three main parts, Genergetic app, Genergetic server and Genegergetic IoT (hardware). 
    
   * Genergetic app interacts with users and make API calls to Genergetic server.
    
   * Genergetic server are the controller for three services on IBM Cloud, they are Waston Machine Learning, Cloudant, and Waston IoT Platform. Genergetic server is deployed onto IBM Cloud Foundry
   
   * Genergetic IoT runs scripts to send MQTT messages to Waston IoT Platform, and the messages include useful data such as timestamp and readings from the device.

## Sequence Diagram:
### Publishing new readings:
![Sequence Diagram](https://github.com/GursehajHarika/Genergetic/blob/main/public/images/Sequence_Diagram.png)
#### Descrption:
   The Automated script from Genergetic IoT reads the readings from the sensors and constructs a MQTT message to send. The Waston IoT Platform recvices the message, return a successful message to the IoT, and trigger the suscribption event. Genergetic server listen to the event, construct a document and insert it into Cloudant database. The Cloudant databse sends successful messsage.


