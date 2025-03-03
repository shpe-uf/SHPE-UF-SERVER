const { model, Schema } = require('mongoose');

const eventSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  category: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  attendance: {
    type: Number,
    required: true,
  },
  expiration: {
    type: String,
    required: true,
  },
  semester: {
    type: String,
    required: true,
  },
  createdAt: {
    type: String,
    required: true,
  },
  request: {
    type: Boolean,
    required: true,
  },
  users: [{
    type: Types.ObjectId,
    ref: 'UserAttendance'
  }],
});

module.exports = model('Event', eventSchema);
