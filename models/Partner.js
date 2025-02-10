const { model, Schema } = require('mongoose');

const partnerSchema = new Schema({
  name: {
    type: String,
    default: '',
    required: true,
  },
  photo: {
    type: String,
    default: '',
    required: true,
  },
  tier: {
    type: String,
    default: 'Bronze',
    required: true,
  }
});

module.exports = model('Partner', partnerSchema);
