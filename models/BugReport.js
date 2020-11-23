const { model, Schema } = require("mongoose");

const reportBugSchema = new Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
       // unique: true,
    },
    reportType: {
        type: String,
        required: true,
    },
    report: {
        type: String,
        required: true
    },

})

module.exports = model("bugReport", reportBugSchema);