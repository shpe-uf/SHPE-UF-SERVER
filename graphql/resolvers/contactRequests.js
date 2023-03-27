const nodemailer = require("nodemailer");
const nodemailerSendgrid = require("nodemailer-sendgrid");

require("dotenv").config();

const contactRequest = require("../../models/ContactRequest.js");
const { validateContactUsForm } = require("../../util/validators");

const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);

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
          from: process.env.EMAIL,
          to: "vptech.shpeuf@gmail.com",
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
