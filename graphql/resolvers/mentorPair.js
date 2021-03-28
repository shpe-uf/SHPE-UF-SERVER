const { UserInputError } = require("apollo-server");
const MentorPair = require("../../models/MentorPair.js");
const { validateReimbursementRequest } = require("../../util/validators");
const nodemailer = require("nodemailer");

require("dotenv").config();

module.exports = {
    Query: {
        async getMentorPairs() {
            try {
                const mentorPairs = await MentorPair.find().sort({mentor: 1, mentee: 1});
                return mentorPairs;
            } catch (err) {
                throw new Error(err);
            }
        }
    },

    Mutation: {
        async createMentorPair(
            _,
            {
                mentorPairInput: {
                    mentor,
                    mentee
                }
            }
        ) {
            try {
                const newMentorPair = new MentorPair({
                    mentor,
                    mentee
                });

                await newMentorPair.save();

                return newMentorPair
            } catch (err) {
                throw new Error(err);
            }
        }
    }
}