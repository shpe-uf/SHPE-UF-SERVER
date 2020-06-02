const { model, Schema } = require('mongoose');
const mongoose = require('mongoose');

const rentableSchema = new Schema({
  item: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  level: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  renters: {
    type: [String],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  }
}, {
  collection: 'Inventory'
});

const switchDB = mongoose.createConnection(process.env.DB_URI,{ useNewUrlParser: true, useUnifiedTopology: true });

module.exports = switchDB.model('User', rentableSchema);