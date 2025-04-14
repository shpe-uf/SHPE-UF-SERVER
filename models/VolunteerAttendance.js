const { model, Schema } = require("mongoose");

const volunteeringAttendanceSchema = new Schema({
  user: {
    type: String,
    required: true,
    lowercase: true,
  },
  event: {
    type: String,
    required: true,
  },
  checkInTime: {
    type: Date,
    required: true,
  },
  checkOutTime: {
    type: Date,
  },
  hoursVolunteered: {
    type: Number,
  },
});
volunteeringAttendanceSchema.index({ user: 1, event: 1 }, { unique: true }); // one check in per user per event

module.exports = model("VolunteeringAttendance", volunteeringAttendanceSchema);
