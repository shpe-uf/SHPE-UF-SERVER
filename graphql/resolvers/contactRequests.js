const { UserInputError } = require("apollo-server");

const contactRequest = require("../../models/ContactRequest.js");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
require("dotenv").config();

const { validateContactUsForm } = require("../../util/validators");

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
        throw new UserInputError("Errors", {
          errors,
        });
      }

      const newContactRequest = new contactRequest({
        firstName,
        lastName,
        email,
        messageType,
        message,
      });

      await newContactRequest.save();

      const msg = {
        to: "vptech.shpeuf@gmail.com",
        from: "shpeufdev@gmail.com",
        subject: "Contact Request From " + firstName + " " + lastName,
        text: "Here's a Request from the Website!",
        html:
          "<strong>Contact Request Type:</strong> " + messageType + "<br>" +
          "<strong>Message:</strong> " + message + "<br>" +
          "To reply to " + firstName + ", email " + email,
      };
      sgMail
        .send(msg)
        .then(() => {
          console.log("Email sent");
        })
        .catch((error) => {
          console.error(error);
        });

      return newContactRequest;
    },
  },
};
