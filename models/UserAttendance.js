const { model, Schema } = require('mongoose');
const { model, Schema, Types } = require('mongoose');

const userAttendanceSchema = new Schema({
  user: {
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  },
  event: {
    type: Types.ObjectId,
    ref: 'Event',
  },
  checkInTime: {
    type: Date,
  },
  checkOutTime: {
    type: Date,
  },
  hoursVolunteered: {
    type: Number,
    default: 0, // This will be calculated on its own
  },
// Expandable option for the future
//   role: {
//     type: String,
//     enum: ['volunteer', 'organizer', 'speaker', 'attendee'],
//   },

// Status for volunteering aka approved volunteer hours
//   status: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected'],
//     default: 'pending', // Defaulted to pending 
//   },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model('UserAttendance', userAttendanceSchema);
