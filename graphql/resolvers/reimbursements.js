const { UserInputError } = require("apollo-server");
const Reimbursement = require("../../models/Reimbursement.js");
const { validateReimbursementRequest } = require("../../util/validators");
const nodemailer = require("nodemailer");

require("dotenv").config();

module.exports = {
    Query: {
        async getReimbursements() {
            try {
                const reimbursement = await Reimbursement.find().sort({lastName: 1, firstName: 1});
                return reimbursement;
            } catch (err) {
                throw new Error(err);
            }
        }
    },

    Mutation: {
        async reimbursementRequest(
            _,
            {
                reimbursementInput: {
                    firstName,
                    lastName,
                    email,
                    studentId,
                    address,
                    company,
                    event,
                    description,
                    reimbursed,
                    amount,
                    execute
                }
            }
        ) {
            const { valid, errors } = validateReimbursementRequest(
                firstName,
                lastName,
                email,
                studentId,
                address,
                company,
                event,
                description,
                reimbursed,
                amount
            );

            if (!valid) {
                throw new UserInputError("Errors", {
                    errors
                });
            }

                const newReimbursement = new Reimbursement({
                    firstName,
                    lastName,
                    email,
                    studentId,
                    address,
                    company,
                    event,
                    description,
                    reimbursed,
                    amount
                });

            
            if (execute) {
                console.log(newReimbursement);
                await newReimbursement.save();

                const transporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE,
                    auth: {
                      user: process.env.EMAIL,
                      pass: process.env.EMAIL_PASSWORD
                    }
                });
            
                const requesterMail = {
                    from: process.env.EMAIL,
                    to: `${email}`,
                    subject: "Reimbursement Request",
                    text:
                      "You made a request for a reimbursement.\n\n" +
                      `Name: ${firstName} ${lastName}\n` +
                      `Email: ${email}\n` +
                      `Student ID: ${studentId}\n` +
                      `Address: ${company}\n` +
                      `Event: ${event}\n` +
                      `Event description: ${description}\n` +
                      `Amount: $${amount}\n\n` +
                      "You will get a confirmation email when your request is approved."
                };
            
                transporter.sendMail(requesterMail, (err, response) => {
                    if (err) {
                      console.error("there was an error: ", err);
                    } else {
                      res.status(200).json('recovery email sent');
                    }
                });

                const treasuryMail = {
                    from: process.env.EMAIL,
                    to: `covielladiego@gmail.com`,
                    subject: "Reimbursement Request - " + `${firstName} ${lastName}`,
                    text:
                      "There is a new request for a reimbursement.\n\n" +
                      `Name: ${firstName} ${lastName}\n` +
                      `Email: ${email}\n` +
                      `Student ID: ${studentId}\n` +
                      `Address: ${company}\n` +
                      `Event: ${event}\n` +
                      `Event description: ${description}\n` +
                      `Amount: $${amount}\n\n`
                };

                transporter.sendMail(treasuryMail, (err, response) => {
                    if (err) {
                      console.error("there was an error: ", err);
                    } else {
                      res.status(200).json('recovery email sent');
                    }
                });
            }
            
            return newReimbursement;            
        }
    }
};