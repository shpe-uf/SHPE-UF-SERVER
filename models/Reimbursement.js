const { model, Schema } = require("mongoose");

const reimbursementSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    studentId: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    event: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    reimbursed: {
        type: String,
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    ufEmployee: {
        type: Boolean,
        required: true
    },
    receiptPhoto: {
        type: String,
        required: false
    },
    eventFlyer: {
        type: String,
        required: false
    }
});

module.exports = model("Reimbursement", reimbursementSchema);