const { UserInputError } = require("apollo-server");

const bugReport = require("../../models/BugReport.js");

require("dotenv").config();

module.exports = {
    Mutation: {
        async reportBug(_, { report } ) {

            if(report.length === 0) {
                throw new UserInputError("Empty String", {
                    error: "empty string",
                  });
            }

            const newReport = new bugReport({
                report
            });

            await newReport.save();

            return newReport;
        },
    }
}