const { model, Schema } = require('mongoose');

const gbmslideSchema = new Schema({
  title: {
    type: String,
    default: '',
    required: true,
  },
  link: {
    type: String,
    default: '',
    required: true,
  },
  thumbnail: {
    type: String,
    default: '',
    required: true,
  }
});


module.exports = model('GbmSlide', gbmslideSchema);
