const { model, Schema } = require('mongoose');

const EBOARD_POSITIONS = [
  'President',
  'VP of Research',
  'Secretary',
  'Treasurer',
  'VP of Marketing',
  'VP of Technology',
  'VP of Corporate Affairs',
  'VP of External Affairs',
  'VP of Internal Affairs'
];

const eboardSchema = new Schema({
  position: {
    type: String,
    enum: EBOARD_POSITIONS,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  picture: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
    required: true,
  },
  createdAt: {
    type: String,
    default: () => new Date().toISOString(),
  },
});

module.exports = model('EboardMember', eboardSchema);
