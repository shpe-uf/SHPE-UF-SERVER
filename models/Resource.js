const { model, Schema } = require('mongoose');

const resourceSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  createdAt: {
    type: String,
    required: true,
  },
  podcast: {
    type: Boolean,
    required: true,
  },
});

module.exports = model('Resource', resourceSchema);
