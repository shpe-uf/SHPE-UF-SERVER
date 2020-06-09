const { model, Schema } = require('mongoose');
const mongoose = require('mongoose');

const receiptSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  item: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false
  },
  dateOpened: {
    type: String,
    required: true
  },
  dateClosed: {
    type: String,
    required: false
  },
  open: {
    type: Boolean,
    required: true
  }
}, {
  collection: 'Receipts'
});

const switchDB = mongoose.createConnection(process.env.DB_URI,{ useNewUrlParser: true, useUnifiedTopology: true });

module.exports = switchDB.model('User', receiptSchema);