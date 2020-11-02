const { model, Schema } = require("mongoose");

const reportBugSchema = new Schema({
    report: {
        type: String,
        required: true
    },
})

module.exports = model("bugReport", reportBugSchema);