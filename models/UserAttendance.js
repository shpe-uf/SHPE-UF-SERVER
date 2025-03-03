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
  createdAt: {
    type: Date,
    default: Date.now,
  },
// ====================== Future Implimentations potentially ===================//
// Expandable to classify user's role in attendance, give gredit to event, etc.
//   role: {
//     type: String,
//     enum: ['volunteer', 'organizer', 'speaker', 'attendee'],
//   },

// Status for approved volunteer hours to avoid fraud for points
//   status: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected'],
//     default: 'pending', // Defaulted to pending 
//   },
});

module.exports = model('UserAttendance', userAttendanceSchema);
