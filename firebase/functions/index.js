'use strict';
const Firestore = require('@google-cloud/firestore');
const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  const firestore = new Firestore();
  const settings = { timestampsInSnapshots: true };
  firestore.settings(settings);
  var name = agent.parameters.name;
  var meet = agent.parameters.meet;




  function handleName(agent) {
    var nameField = request.body.queryResult.outputContexts[0].parameters.name;
    console.log('1------ ' + nameField);
    var dbCollection = db.collection('PlayerInfo').doc(nameField);
    return dbCollection.get()
      .then(doc => {
        if (!doc.exists) { agent.add(`No Such User found`); }
        else {
          //var Data = JSON.stringify(doc.data());
          var Question = doc.data().Ques;
          console.log("Question is: " + Question);
          agent.add(`The Question is: ` + Question);
        }
      }).catch(err => {
        console.log("Error is Getting the Document: " + err);
      });
  }

  function handleAnswer(agent) {
    var nameField = request.body.queryResult.outputContexts[0].parameters.name;
    console.log('2------- ' + nameField);
    var dbCollection = db.collection('PlayerInfo').doc(nameField);
    const ans = agent.parameters.ans;
    agent.add(`Your answer is: ` + ans);
    return dbCollection.update({
      "YourAns": ans
    });
  }

  function SendEmail(agent) {
    var meetingField;
    if (request.body.queryResult.parameters.meet.length > 1) {
      meetingField = request.body.queryResult.parameters.meet[0] +
        ' ' + request.body.queryResult.parameters.meet[1];
      var dbCollection1 = db.collection('EmployeeInfo').doc(meetingField);
      agent.add(`Contacting ` + meetingField);
      return dbCollection1.get()
        .then(doc => {
          if (!doc.exists) { agent.add(`No Employee found`); }
          else {
            //var Data = JSON.stringify(doc.data());
            agent.add(meetingField + ` will be with you in a while`);
            var Email = doc.data().EmailID;
            console.log("Email: " + Email);
            var transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: 'mehulnagar26@gmail.com',
                pass: 'YOUR PWD'
              }
            });

            var mailOptions = {
              from: 'mehulnagar26@gmail.com',
              to: Email,
              subject: 'Sending Email using Node.js',
              text: 'That was easy!'
            };
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log('Email sent: ' + info.response);
              }
            });
          }
        });
    }
    else {
      agent.add(`Please say the full name`);
    }
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('AskName', handleName);
  intentMap.set('AskAnswer', handleAnswer);
  intentMap.set('Meeting', SendEmail);
  agent.handleRequest(intentMap);
});