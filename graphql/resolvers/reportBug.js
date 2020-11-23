const { UserInputError } = require("apollo-server");

const bugReport = require("../../models/BugReport.js");

require("dotenv").config();

const { validateContactUsForm } = require("../../util/validators");

module.exports = {
    Mutation: {
        async reportBug(_, 
            { contactUsInput: 
                {
                    firstName, 
                    lastName, 
                    email, 
                    reportType, 
                    report
                } 
            } 
        ) {
            const { valid, errors } = validateContactUsForm(
                firstName,
                lastName,
                email,
                reportType,
                report,
            );

            if (!valid) {
                throw new UserInputError("Errors", {
                  errors
                });
            }

            const newReport = new bugReport({
                firstName,
                lastName,
                email,
                reportType,
                report
            });

            await newReport.save();

            return newReport;
        },
    }
}