const { model, Schema } = require("mongoose");

const mentorPairSchema = new Schema({
    mentor: {
        type: String,
        required: true
    },
    mentee: {
        type: String,
        required: true
    }
});

module.exports = model("MentorPair", mentorPairSchema);