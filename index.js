'use strict';

require('dotenv').config();

// Imports dependencies and set up http server
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express().use(bodyParser.json()); // creates express http server

//  get page access token
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
    //  Parse the request body from the POST
    let body = req.body;
      
    // Check the webhook event is from a page subscription
    if (body.object === 'page') {
  
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {
  
        // Gets the webhook event entry.messaging is an array, but 
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);

        //  Get the sender PSID
        let sender_psid = webhook_event.sender.id;
        console.log('Sender PSID: ' + sender_psid);

        //  Check if the event is a message or postback and 
        //  pass the event to the appropriate handler function
        if (webhook_event.message){
          handleMessage(sender_psid, webhook_event.message);
        } else if (webhook_event.postback){
          handlePostback(sender_psid, webhook_event.postback);
        }
        //   let request_body = {
        //     recipient: {
        //       id: webhook_event.sender.id
        //     },
        //     message: webhook_event.message.text
        //   };
        //   fetch( `https://graph.facebook.com/v4.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, 
        //     {
        //       method: "POST",
        //       body: JSON.stringify(request_body),
        //       headers: { 'Content-Type': 'application/json'}
        //     },
        //     (err, res, body) => {
        //       if (err) {
        //         console.error("Unable to send message:" +err);
        //       }else if ( body.include("recipient_id")) {
        //         console.log("message sent", body);
        //       }
        //     }
        //   );
        // }
        
      });
  
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  
  });

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    console.log("req:" + req);
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFICATION_TOKEN;
      
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);      
      }
    }
});

//  Handles messages events
function handleMessage(sender_psid, received_message){
  let response;

  //  check if the message contains text
  if(received_message.text){
    //  create the payload for a basic text message, which will be added to the body
    //  of our request to the Send API
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
    }
  } else if ( received_message.attachments ){
    //  Gets the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ],
          }]
        }
      }
    }
  }
  
  //  sends the response message
  callSendAPI(sender_psid, response);
}

//  Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  //  
  let response;
  //  Get the payload for the postback
  let payload = received_postback.payload;

  //  Set the response based on the postback payload
  if ( paylaod === 'yes') {
    response = { "text": "Thanks!" }
  } else if ( payload === 'no') {
    response = { "text": "Oops, try sending another picture." }
  }
  //  Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);

}

//  Sends response messages via the Send API
function callSendAPI(sender_psid, response){
  //  construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  //  send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

