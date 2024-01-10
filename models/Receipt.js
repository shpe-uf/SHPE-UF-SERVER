const { Schema } = require('mongoose');
const mongoose = require('mongoose');

const receiptSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
    },
    item: {
      type: String,
      required: true,
    },
    quantity: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    dateCheckedOut: {
      type: String,
      required: true,
    },
    datePickedUp: {
      type: String,
      required: false,
    },
    dateClosed: {
      type: String,
      required: false,
    },
    deleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    collection: 'Receipts',
  }
);

const switchDB = mongoose.createConnection(process.env.DB_URI, {});

module.exports = switchDB.model('Receipt', receiptSchema);
