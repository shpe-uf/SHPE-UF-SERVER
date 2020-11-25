const { UserInputError } = require("apollo-server");

const contactRequest = require("../../models/ContactRequest.js");

require("dotenv").config();

const { validateContactUsForm } = require("../../util/validators");

module.exports = {
    Mutation: {
        async submitContactRequest(_, 
            { contactUsFormInput: 
                {
                    firstName, 
                    lastName, 
                    email, 
                    messageType, 
                    message
                } 
            } 
        ) {
            const { valid, errors } = validateContactUsForm(
                firstName,
                lastName,
                email,
                messageType,
                message,
            );

            if (!valid) {
                throw new UserInputError("Errors", {
                  errors
                });
            }

            const newContactRequest = new contactRequest({
                firstName,
                lastName,
                email,
                messageType,
                message
            });

            await newContactRequest.save();

            return newContactRequest;
        },
    }
}