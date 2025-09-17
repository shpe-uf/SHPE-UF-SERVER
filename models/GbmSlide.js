const { model, Schema } = require('mongoose');

const gbmslideSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    required: true,
  }
});


module.exports = model('GbmSlide', gbmslideSchema);
