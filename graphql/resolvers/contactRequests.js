//const nodemailer = require("nodemailer");
//const nodemailerSendgrid = require("nodemailer-sendgrid");

const nodemailer = require("nodemailer");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

require("dotenv").config();

const contactRequest = require("../../models/ContactRequest.js");
const { validateContactUsForm } = require("../../util/validators");

const sesClient = new SESv2Client({ region: process.env.AWS_REGION });

const transport = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand},
});


const { handleInputError } = require("../../util/error-handling");

module.exports = {
  Mutation: {
    async submitContactRequest(
      _,
      { firstName, lastName, email, messageType, message }
    ) {
      const { valid, errors } = validateContactUsForm(
        firstName,
        lastName,
        email,
        messageType,
        message
      );

      if (!valid) {
        handleInputError(errors);
      }

      const newContactRequest = new contactRequest({
        firstName,
        lastName,
        email,
        messageType,
        message,
      });

      await newContactRequest.save();

      transport
        .sendMail({
          from: email,
          to: process.env.EMAIL,
          subject: "Contact Request From " + firstName + " " + lastName,
          html:
            "<strong>Contact Request Type:</strong> " +
            messageType +
            "<br>" +
            "<strong>Message:</strong> " +
            message +
            "<br>" +
            "To reply to " +
            firstName +
            ", email " +
            email,
        })
        .then(() => {
          console.log("Bug Report Email sent!");
        })
        .catch(() => {
          console.log("Oh no! The email didn't send for some reason :(");
        });

      return newContactRequest;
    },
  },
};
