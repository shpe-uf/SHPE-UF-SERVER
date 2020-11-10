const {model, Schema} = require('mongoose');

const reimbursementSchema = new Schema({
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
  },
  studentId: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  event: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  reimbursed: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

module.exports = model('Reimbursement', reimbursementSchema);
